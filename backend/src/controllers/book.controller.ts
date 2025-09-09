import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../index';
import { AppError } from '../middleware/error.middleware';
import fs from 'fs';
import path from 'path';

enum UserRole {
  ADMIN = "ADMIN",
  SECRETARIAT = "SECRETARIAT",
  REVIEWER = "REVIEWER",
  COMMITTEE = "COMMITTEE"
}

enum BookStatus {
  PENDING_REVIEW = "PENDING_REVIEW",
  UNDER_REVIEW = "UNDER_REVIEW",
  REVIEW_COMPLETED = "REVIEW_COMPLETED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  NEEDS_REVISION = "NEEDS_REVISION"
}

enum Decision {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  NEEDS_REVISION = "NEEDS_REVISION"
}

// Upload book metadata + PDF
export const uploadBook = async (
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

    // Check if file was uploaded
    if (!req.file) {
      return next(new AppError('PDF file is required', 400));
    }

    const { title, authors, publisher, edition, syllabus_version } = req.body;
    const pdfPath = req.file.path;

    // Create book in database
    const book = await prisma.book.create({
      data: {
        title,
        authors,
        publisher,
        edition,
        syllabus_version,
        pdf_path: pdfPath,
        uploaded_by: req.user!.id,
        status: BookStatus.PENDING_REVIEW,
      },
    });

    return res.status(201).json({
      status: 'success',
      data: {
        book,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all books
export const getAllBooks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Different queries based on user role
    let books;

    switch (req.user!.role) {
      case UserRole.ADMIN:
      case UserRole.SECRETARIAT:
        // Admins and secretariat can see all books
        books = await prisma.book.findMany({
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            assignments: {
              include: {
                reviewer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        });
        break;

      case UserRole.COMMITTEE:
        // Committee members can see books that are under review or completed
        books = await prisma.book.findMany({
          where: {
            status: {
              in: [BookStatus.UNDER_REVIEW, BookStatus.REVIEW_COMPLETED],
            },
          },
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            assignments: {
              include: {
                reviewer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        });
        break;

      case UserRole.REVIEWER:
        // Reviewers can only see books assigned to them
        books = await prisma.book.findMany({
          where: {
            assignments: {
              some: {
                reviewer_id: req.user!.id,
              },
            },
          },
          include: {
            assignments: {
              where: {
                reviewer_id: req.user!.id,
              },
            },
          },
        });
        break;

      default:
        return next(new AppError('Invalid user role', 403));
    }

    return res.status(200).json({
      status: 'success',
      results: books.length,
      data: {
        books,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific book by ID
export const getBookById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Find book by ID
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignments: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            reviews: true,
          },
        },
        aggregate_results: true,
        committee_decisions: {
          include: {
            decider: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!book) {
      return next(new AppError('Book not found', 404));
    }

    // Check if user has access to this book
    if (req.user!.role === UserRole.REVIEWER) {
      const isAssigned = book.assignments.some(
        (assignment: any) => assignment.reviewer_id === req.user!.id
      );

      if (!isAssigned) {
        return next(new AppError('You do not have access to this book', 403));
      }
    }

    return res.status(200).json({
      status: 'success',
      data: {
        book,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Serve the uploaded PDF file for a book
export const getBookFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) {
      return next(new AppError('Book not found', 404));
    }

    const filePath = path.resolve(book.pdf_path);
    if (!fs.existsSync(filePath)) {
      return next(new AppError('File not found', 404));
    }

    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

// Assign reviewers to a book
export const assignReviewers = async (
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
    const { reviewer_ids, due_date } = req.body;

    // Find book by ID
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        assignments: true,
      },
    });

    if (!book) {
      return next(new AppError('Book not found', 404));
    }

    // Check if book is in a valid state for assignment
    if (book.status !== BookStatus.PENDING_REVIEW) {
      return next(
        new AppError('Book is not in a valid state for assignment', 400)
      );
    }

    // Verify all reviewers exist and have REVIEWER role
    const reviewers = await prisma.user.findMany({
      where: {
        id: {
          in: reviewer_ids,
        },
        role: UserRole.REVIEWER,
      },
    });

    if (reviewers.length !== reviewer_ids.length) {
      return next(new AppError('One or more reviewers not found', 404));
    }

    // Create assignments for each reviewer
    const assignments = [];
    for (const reviewerId of reviewer_ids) {
      // Check if reviewer is already assigned
      const existingAssignment = book.assignments.find(
        (a: any) => a.reviewer_id === reviewerId
      );

      if (!existingAssignment) {
        const assignment = await prisma.assignment.create({
          data: {
            book_id: id,
            reviewer_id: reviewerId,
            assigned_by: req.user!.id,
            due_date: new Date(due_date),
            status: 'PENDING',
          },
        });
        assignments.push(assignment);
      }
    }

    // Update book status
    await prisma.book.update({
      where: { id },
      data: {
        status: BookStatus.UNDER_REVIEW,
      },
    });

    return res.status(201).json({
      status: 'success',
      data: {
        assignments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Compute and return aggregated stats for a book
export const getAggregateStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Find book by ID
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            reviews: true,
          },
        },
      },
    });

    if (!book) {
      return next(new AppError('Book not found', 404));
    }

    // Check if all reviews are completed
    const completedReviews = book.assignments.filter(
      (assignment: any) => assignment.status === 'COMPLETED'
    ).length;

    if (completedReviews === 0) {
      return next(new AppError('No completed reviews found', 400));
    }

    // Collect all reviews
    const reviews = book.assignments
      .map((assignment: any) => assignment.reviews)
      .flat()
      .filter((review: any) => !review.draft_flag);

    // Compute statistics for each criterion
    const criteriaStats: Record<string, any> = {};
    const allScores: Record<string, number[]> = {};

    // Initialize with all criteria
    reviews.forEach((review: any) => {
      const scores = review.scores as Record<string, number>;
      Object.keys(scores).forEach((criterionCode) => {
        if (!allScores[criterionCode]) {
          allScores[criterionCode] = [];
        }
        allScores[criterionCode].push(scores[criterionCode]);
      });
    });

    // Calculate statistics for each criterion
    Object.keys(allScores).forEach((criterionCode) => {
      const scores = allScores[criterionCode];
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const median = scores.sort()[Math.floor(scores.length / 2)];
      const variance =
        scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;

      criteriaStats[criterionCode] = {
        mean,
        median,
        variance,
        min: Math.min(...scores),
        max: Math.max(...scores),
        count: scores.length,
      };
    });

    // Generate summary text
    const overallMean =
      Object.values(criteriaStats).reduce(
        (sum, stat: any) => sum + stat.mean,
        0
      ) / Object.keys(criteriaStats).length;

    // Identify strengths and weaknesses
    const sortedCriteria = Object.entries(criteriaStats).sort(
      (a, b) => (b[1] as any).mean - (a[1] as any).mean
    );

    const strengths = sortedCriteria.slice(0, 3).map(([code]) => code);
    const weaknesses = sortedCriteria
      .slice(-3)
      .reverse()
      .map(([code]) => code);

    const summaryText = `Overall mean score: ${overallMean.toFixed(
      2
    )}. Strengths in criteria: ${strengths.join(
      ', '
    )}. Areas for improvement: ${weaknesses.join(', ')}.`;

    // Create or update aggregate result
    const aggregateResult = await prisma.aggregateResult.upsert({
      where: {
        book_id_computed_at: {
          book_id: id,
          computed_at: new Date(),
        },
      },
      update: {
        stats: criteriaStats,
        summary_text: summaryText,
      },
      create: {
        book_id: id,
        stats: criteriaStats,
        summary_text: summaryText,
      },
    });

    return res.status(200).json({
      status: 'success',
      data: {
        aggregateResult,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Record committee decision for a book
export const recordDecision = async (
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
    const { decision, rationale } = req.body;

    // Find book by ID
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        assignments: true,
      },
    });

    if (!book) {
      return next(new AppError('Book not found', 404));
    }

    // Check if book is in a valid state for decision
    if (book.status !== BookStatus.REVIEW_COMPLETED) {
      return next(
        new AppError('Book is not in a valid state for decision', 400)
      );
    }

    // Create committee decision
    const committeeDecision = await prisma.committeeDecision.create({
      data: {
        book_id: id,
        decided_by: req.user!.id,
        decision: decision as Decision,
        rationale,
      },
    });

    // Update book status based on decision
    await prisma.book.update({
      where: { id },
      data: {
        status:
          decision === 'APPROVED'
            ? BookStatus.APPROVED
            : decision === 'REJECTED'
            ? BookStatus.REJECTED
            : BookStatus.NEEDS_REVISION,
      },
    });

    return res.status(201).json({
      status: 'success',
      data: {
        committeeDecision,
      },
    });
  } catch (error) {
    next(error);
  }
};