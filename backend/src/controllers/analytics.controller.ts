import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { AppError } from '../middleware/error.middleware';

// Get reviewer performance metrics
export const getReviewerMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user_role = (req as any).user.role;

    if (!['ADMIN', 'SECRETARIAT'].includes(user_role)) {
      return next(new AppError('Access denied', 403));
    }

    const { reviewerId, startDate, endDate } = req.query;

    const whereClause: any = {};
    if (reviewerId) whereClause.reviewer_id = reviewerId;
    if (startDate && endDate) {
      whereClause.assigned_at = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    // Get assignment statistics
    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviews: true,
        book: {
          select: {
            title: true,
          },
        },
      },
    });

    // Calculate metrics
    const reviewerStats = assignments.reduce((acc, assignment) => {
      const reviewerId = assignment.reviewer_id;
      if (!acc[reviewerId]) {
        acc[reviewerId] = {
          reviewer: assignment.reviewer,
          total_assignments: 0,
          completed_assignments: 0,
          overdue_assignments: 0,
          average_turnaround: 0,
          reliability_score: 0,
          acceptance_rate: 0,
          rejection_rate: 0,
          assignments: [],
        };
      }

      acc[reviewerId].total_assignments++;
      acc[reviewerId].assignments.push(assignment);

      if (assignment.status === 'COMPLETED') {
        acc[reviewerId].completed_assignments++;
      }

      if (assignment.status === 'OVERDUE') {
        acc[reviewerId].overdue_assignments++;
      }

      // Calculate turnaround time
      if (assignment.reviews.length > 0) {
        const review = assignment.reviews[0];
        const turnaroundHours = (review.submitted_at.getTime() - assignment.assigned_at.getTime()) / (1000 * 60 * 60);
        acc[reviewerId].average_turnaround += turnaroundHours;
      }

      return acc;
    }, {} as any);

    // Calculate final metrics
    Object.values(reviewerStats).forEach((stats: any) => {
      if (stats.completed_assignments > 0) {
        stats.average_turnaround = stats.average_turnaround / stats.completed_assignments;
      }

      stats.reliability_score = Math.round(
        ((stats.completed_assignments - stats.overdue_assignments) / stats.total_assignments) * 100
      );

      // Calculate acceptance/rejection rates based on committee decisions
      const completedAssignments = stats.assignments.filter((a: any) => a.status === 'COMPLETED');
      if (completedAssignments.length > 0) {
        // This would need to be calculated based on committee decisions
        stats.acceptance_rate = 0; // Placeholder
        stats.rejection_rate = 0; // Placeholder
      }
    });

    res.status(200).json({
      status: 'success',
      data: Object.values(reviewerStats),
    });
  } catch (error) {
    next(error);
  }
};

// Get system analytics
export const getSystemAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user_role = (req as any).user.role;

    if (!['ADMIN', 'SECRETARIAT'].includes(user_role)) {
      return next(new AppError('Access denied', 403));
    }

    const { startDate, endDate } = req.query;

    const whereClause: any = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    // Get basic counts
    const [
      totalBooks,
      totalAssignments,
      totalReviews,
      totalUsers,
      pendingAssignments,
      overdueAssignments,
      completedReviews,
    ] = await Promise.all([
      prisma.book.count({ where: whereClause }),
      prisma.assignment.count({ where: whereClause }),
      prisma.review.count({ where: whereClause }),
      prisma.user.count(),
      prisma.assignment.count({ where: { ...whereClause, status: 'PENDING' } }),
      prisma.assignment.count({ where: { ...whereClause, status: 'OVERDUE' } }),
      prisma.review.count({ where: { ...whereClause, draft_flag: false } }),
    ]);

    // Get books by status
    const booksByStatus = await prisma.book.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
      where: whereClause,
    });

    // Get assignments by status
    const assignmentsByStatus = await prisma.assignment.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
      where: whereClause,
    });

    // Get monthly trends
    const monthlyTrends = await prisma.book.groupBy({
      by: ['uploaded_at'],
      _count: {
        id: true,
      },
      where: whereClause,
      orderBy: {
        uploaded_at: 'asc',
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalBooks,
          totalAssignments,
          totalReviews,
          totalUsers,
          pendingAssignments,
          overdueAssignments,
          completedReviews,
        },
        booksByStatus: booksByStatus.map(item => ({
          status: item.status,
          count: item._count.status,
        })),
        assignmentsByStatus: assignmentsByStatus.map(item => ({
          status: item.status,
          count: item._count.status,
        })),
        monthlyTrends: monthlyTrends.map(item => ({
          month: item.uploaded_at.toISOString().substring(0, 7),
          count: item._count.id,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get assignment tracking for Secretariat
export const getAssignmentTracking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user_role = (req as any).user.role;

    if (!['ADMIN', 'SECRETARIAT'].includes(user_role)) {
      return next(new AppError('Access denied', 403));
    }

    const { page = 1, limit = 10, status, reviewerId, bookId } = req.query;

    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (reviewerId) whereClause.reviewer_id = reviewerId;
    if (bookId) whereClause.book_id = bookId;

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            authors: true,
            status: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assigner: {
          select: {
            id: true,
            name: true,
          },
        },
        reviews: {
          select: {
            id: true,
            submitted_at: true,
            draft_flag: true,
          },
        },
        coi_declarations: {
          select: {
            id: true,
            has_conflict: true,
            declared_at: true,
          },
        },
      },
      orderBy: {
        assigned_at: 'desc',
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const total = await prisma.assignment.count({
      where: whereClause,
    });

    // Calculate additional fields
    const assignmentsWithDetails = assignments.map(assignment => {
      const daysUntilDue = Math.ceil(
        (assignment.due_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const isOverdue = daysUntilDue < 0 && assignment.status !== 'COMPLETED';
      const hasCOI = assignment.coi_declarations.length > 0;
      const hasConflict = hasCOI && assignment.coi_declarations[0].has_conflict;
      const hasReview = assignment.reviews.length > 0;
      const isDraft = hasReview && assignment.reviews[0].draft_flag;

      return {
        ...assignment,
        days_until_due: daysUntilDue,
        is_overdue: isOverdue,
        has_coi: hasCOI,
        has_conflict: hasConflict,
        has_review: hasReview,
        is_draft: isDraft,
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        assignments: assignmentsWithDetails,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
