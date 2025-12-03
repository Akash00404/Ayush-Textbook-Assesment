import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { AppError } from '../middleware/error.middleware';
import {
  generateAISummary,
  detectConflicts,
  generateActionSuggestions,
  detectLanguage,
} from '../services/gemini.service';

/**
 * Generate AI summary for a book's reviews
 */
export const generateSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookId } = req.params;
    const { language, forceRegenerate } = req.query;

    // Check if summary already exists and not forcing regeneration
    if (!forceRegenerate) {
      const existingSummary = await prisma.aISummary.findFirst({
        where: { book_id: bookId },
        orderBy: { generated_at: 'desc' },
      });

      if (existingSummary) {
        return res.status(200).json({
          status: 'success',
          data: {
            summary: existingSummary,
          },
        });
      }
    }

    // Get book details
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        assignments: {
          include: {
            reviews: {
              where: { draft_flag: false },
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
        },
      },
    });

    if (!book) {
      return next(new AppError('Book not found', 404));
    }

    // Collect all completed reviews
    const reviews = book.assignments
      .flatMap((assignment) => assignment.reviews)
      .filter((review) => !review.draft_flag);

    if (reviews.length === 0) {
      return next(new AppError('No completed reviews found for this book', 400));
    }

    // Prepare review data
    const reviewData = reviews.map((review) => ({
      reviewerId: review.reviewer.id,
      reviewerName: review.reviewer.name,
      scores: review.scores as Record<string, number>,
      comments: review.comments as Record<string, string>,
      submittedAt: review.submitted_at,
    }));

    // Detect language if not provided
    let detectedLanguage = language as string | undefined;
    if (!detectedLanguage && reviews.length > 0) {
      const sampleComment = (reviews[0].comments as Record<string, string>)['OVERALL'] || '';
      if (sampleComment) {
        detectedLanguage = await detectLanguage(sampleComment);
      }
    }

    // Generate AI summary
    const aiSummary = await generateAISummary(
      bookId,
      reviewData,
      book.title,
      detectedLanguage
    );

    // Save to database
    const savedSummary = await prisma.aISummary.create({
      data: {
        book_id: bookId,
        summary_text: aiSummary.summary,
        strengths: aiSummary.strengths,
        weaknesses: aiSummary.weaknesses,
        recommendations: aiSummary.recommendations,
        language: aiSummary.language || detectedLanguage || 'en',
        model_version: 'gemini-pro',
        confidence_score: aiSummary.confidenceScore || 0.8,
      },
    });

    return res.status(201).json({
      status: 'success',
      data: {
        summary: savedSummary,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Detect conflicts in reviews
 */
export const detectReviewConflicts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookId } = req.params;
    const { forceRegenerate } = req.query;

    // Check if conflicts already detected
    if (!forceRegenerate) {
      const existingConflicts = await prisma.conflictFlag.findMany({
        where: {
          book_id: bookId,
          resolved: false,
        },
      });

      if (existingConflicts.length > 0) {
        return res.status(200).json({
          status: 'success',
          data: {
            conflicts: existingConflicts,
          },
        });
      }
    }

    // Get book with reviews
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        assignments: {
          include: {
            reviews: {
              where: { draft_flag: false },
              include: {
                reviewer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!book) {
      return next(new AppError('Book not found', 404));
    }

    // Get criteria
    const criteria = await prisma.criterion.findMany();

    // Collect reviews
    const reviews = book.assignments
      .flatMap((assignment) => assignment.reviews)
      .filter((review) => !review.draft_flag);

    if (reviews.length < 2) {
      return res.status(200).json({
        status: 'success',
        data: {
          conflicts: [],
          message: 'Need at least 2 reviews to detect conflicts',
        },
      });
    }

    // Prepare review data
    const reviewData = reviews.map((review) => ({
      reviewerId: review.reviewer.id,
      reviewerName: review.reviewer.name,
      scores: review.scores as Record<string, number>,
      comments: review.comments as Record<string, string>,
      submittedAt: review.submitted_at,
    }));

    // Detect conflicts
    const conflictResult = await detectConflicts(
      bookId,
      reviewData,
      criteria.map((c) => ({ code: c.code, label: c.label }))
    );

    // Save conflicts to database
    const savedConflicts = await Promise.all(
      conflictResult.conflicts.map((conflict) =>
        prisma.conflictFlag.create({
          data: {
            book_id: bookId,
            criterion_code: conflict.criterionCode || null,
            conflict_type: conflict.type,
            severity: conflict.severity,
            description: conflict.description,
            reviewer_ids: conflict.reviewerIds,
            score_variance: conflict.scoreVariance || null,
          },
        })
      )
    );

    return res.status(201).json({
      status: 'success',
      data: {
        conflicts: savedConflicts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate action suggestions
 */
export const generateActions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookId } = req.params;

    // Get book with reviews
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        assignments: {
          include: {
            reviews: {
              where: { draft_flag: false },
              include: {
                reviewer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        ai_summaries: {
          orderBy: { generated_at: 'desc' },
          take: 1,
        },
        conflict_flags: {
          where: { resolved: false },
        },
      },
    });

    if (!book) {
      return next(new AppError('Book not found', 404));
    }

    // Collect reviews
    const reviews = book.assignments
      .flatMap((assignment) => assignment.reviews)
      .filter((review) => !review.draft_flag);

    if (reviews.length === 0) {
      return next(new AppError('No completed reviews found', 400));
    }

    // Prepare review data
    const reviewData = reviews.map((review) => ({
      reviewerId: review.reviewer.id,
      reviewerName: review.reviewer.name,
      scores: review.scores as Record<string, number>,
      comments: review.comments as Record<string, string>,
      submittedAt: review.submitted_at,
    }));

    // Get or generate AI summary
    let aiSummary;
    if (book.ai_summaries.length > 0) {
      const summary = book.ai_summaries[0];
      aiSummary = {
        summary: summary.summary_text,
        strengths: summary.strengths as any,
        weaknesses: summary.weaknesses as any,
        recommendations: summary.recommendations as any,
        language: summary.language || 'en',
        confidenceScore: summary.confidence_score || 0.8,
      };
    } else {
      // Generate summary first
      aiSummary = await generateAISummary(
        bookId,
        reviewData,
        book.title
      );
    }

    // Get or detect conflicts
    let conflicts;
    if (book.conflict_flags.length > 0) {
      conflicts = {
        conflicts: book.conflict_flags.map((cf) => ({
          type: cf.conflict_type,
          severity: cf.severity,
          criterionCode: cf.criterion_code || undefined,
          description: cf.description,
          reviewerIds: cf.reviewer_ids as string[],
          scoreVariance: cf.score_variance || undefined,
        })),
      };
    } else {
      const criteria = await prisma.criterion.findMany();
      conflicts = await detectConflicts(
        bookId,
        reviewData,
        criteria.map((c) => ({ code: c.code, label: c.label }))
      );
    }

    // Generate action suggestions
    const actionResult = await generateActionSuggestions(
      bookId,
      reviewData,
      aiSummary,
      conflicts,
      book.title
    );

    return res.status(200).json({
      status: 'success',
      data: actionResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get AI summary for a book
 */
export const getAISummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookId } = req.params;

    const summary = await prisma.aISummary.findFirst({
      where: { book_id: bookId },
      orderBy: { generated_at: 'desc' },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            authors: true,
          },
        },
      },
    });

    if (!summary) {
      return next(new AppError('AI summary not found. Generate one first.', 404));
    }

    return res.status(200).json({
      status: 'success',
      data: {
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get conflicts for a book
 */
export const getConflicts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookId } = req.params;
    const { resolved } = req.query;

    const conflicts = await prisma.conflictFlag.findMany({
      where: {
        book_id: bookId,
        ...(resolved !== undefined ? { resolved: resolved === 'true' } : {}),
      },
      orderBy: [
        { severity: 'desc' },
        { detected_at: 'desc' },
      ],
    });

    return res.status(200).json({
      status: 'success',
      data: {
        conflicts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resolve a conflict
 */
export const resolveConflict = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { conflictId } = req.params;
    const { resolutionNotes } = req.body;

    const conflict = await prisma.conflictFlag.update({
      where: { id: conflictId },
      data: {
        resolved: true,
        resolution_notes: resolutionNotes || null,
      },
    });

    return res.status(200).json({
      status: 'success',
      data: {
        conflict,
      },
    });
  } catch (error) {
    next(error);
  }
};

