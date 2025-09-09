import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../index';
import { AppError } from '../middleware/error.middleware';

enum UserRole {
  ADMIN = "ADMIN",
  SECRETARIAT = "SECRETARIAT",
  REVIEWER = "REVIEWER",
  COMMITTEE = "COMMITTEE"
}

enum AssignmentStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  OVERDUE = "OVERDUE"
}

// Submit a review for an assignment
export const submitReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { scores, comments, draft_flag } = req.body;

    // Find assignment by ID
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        book: true,
        reviews: {
          where: {
            reviewer_id: req.user!.id,
          },
        },
      },
    });

    if (!assignment) {
      return next(new AppError('Assignment not found', 404));
    }

    // Check if user is the assigned reviewer
    if (assignment.reviewer_id !== req.user!.id) {
      return next(
        new AppError('You are not authorized to review this assignment', 403)
      );
    }

    // Validate scores against criteria
    const criteria = await prisma.criterion.findMany();
    const criterionCodes = criteria.map((c: any) => c.code);

    for (const code of Object.keys(scores)) {
      if (!criterionCodes.includes(code)) {
        return next(new AppError(`Invalid criterion code: ${code}`, 400));
      }

      const score = scores[code];
      if (typeof score !== 'number' || score < 1 || score > 5) {
        return next(
          new AppError(
            `Score for criterion ${code} must be a number between 1 and 5`,
            400
          )
        );
      }
    }

    // Create or update review
    let review;
    if (assignment.reviews.length > 0) {
      // Update existing review
      review = await prisma.review.update({
        where: { id: assignment.reviews[0].id },
        data: {
          scores,
          comments,
          draft_flag,
          submitted_at: new Date(),
        },
      });
    } else {
      // Create new review
      review = await prisma.review.create({
        data: {
          assignment_id: id,
          reviewer_id: req.user!.id,
          scores,
          comments,
          draft_flag,
        },
      });
    }

    // Update assignment status if review is finalized
    if (!draft_flag) {
      await prisma.assignment.update({
        where: { id },
        data: {
          status: AssignmentStatus.COMPLETED,
        },
      });

      // Check if all assignments for this book are completed
      const allAssignments = await prisma.assignment.findMany({
        where: {
          book_id: assignment.book_id,
        },
      });

      const allCompleted = allAssignments.every(
        (a: any) => a.status === AssignmentStatus.COMPLETED
      );

      if (allCompleted) {
        // Update book status to REVIEW_COMPLETED
        await prisma.book.update({
          where: { id: assignment.book_id },
          data: {
            status: 'REVIEW_COMPLETED',
          },
        });
      }
    }

    return res.status(201).json({
      status: 'success',
      data: {
        review,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific review by ID
export const getReviewById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        assignment: {
          include: {
            book: true,
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!review) {
      return next(new AppError('Review not found', 404));
    }

    // Check if user has access to this review
    if (
      req.user!.role === UserRole.REVIEWER &&
      review.reviewer_id !== req.user!.id
    ) {
      return next(new AppError('You do not have access to this review', 403));
    }

    return res.status(200).json({
      status: 'success',
      data: {
        review,
      },
    });
  } catch (error) {
    next(error);
  }
};