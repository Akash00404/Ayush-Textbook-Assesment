import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { AppError } from '../middleware/error.middleware';
import {
  calculateReviewerScore,
  calculateAllReviewerScores,
  getReviewerScore,
} from '../services/reviewerScore.service';

/**
 * Get reviewer score
 */
export const getReviewerScoreById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { reviewerId } = req.params;

    // Check if user has permission (admin, secretariat, or the reviewer themselves)
    if (
      req.user!.role !== 'ADMIN' &&
      req.user!.role !== 'SECRETARIAT' &&
      req.user!.id !== reviewerId
    ) {
      return next(new AppError('You do not have permission to view this reviewer score', 403));
    }

    let score = await getReviewerScore(reviewerId);

    // Calculate if doesn't exist
    if (!score) {
      score = await calculateReviewerScore(reviewerId);
    }

    return res.status(200).json({
      status: 'success',
      data: {
        score,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate/update reviewer score
 */
export const calculateScore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { reviewerId } = req.params;

    // Only admin and secretariat can trigger recalculation
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SECRETARIAT') {
      return next(new AppError('You do not have permission to calculate reviewer scores', 403));
    }

    const score = await calculateReviewerScore(reviewerId);

    return res.status(200).json({
      status: 'success',
      data: {
        score,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate scores for all reviewers
 */
export const calculateAllScores = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Only admin can trigger bulk calculation
    if (req.user!.role !== 'ADMIN') {
      return next(new AppError('Only admins can calculate all reviewer scores', 403));
    }

    await calculateAllReviewerScores();

    return res.status(200).json({
      status: 'success',
      message: 'All reviewer scores calculated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all reviewer scores (for admin/secretariat)
 */
export const getAllReviewerScores = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Only admin and secretariat can view all scores
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SECRETARIAT') {
      return next(new AppError('You do not have permission to view all reviewer scores', 403));
    }

    const scores = await prisma.reviewerScore.findMany({
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            institution: true,
          },
        },
      },
      orderBy: {
        reliability_score: 'desc',
      },
    });

    return res.status(200).json({
      status: 'success',
      data: {
        scores,
      },
    });
  } catch (error) {
    next(error);
  }
};

