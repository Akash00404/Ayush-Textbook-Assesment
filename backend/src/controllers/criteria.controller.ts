import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../index';
import { AppError } from '../middleware/error.middleware';

// Get all criteria
export const getCriteria = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const criteria = await prisma.criterion.findMany({
      orderBy: {
        code: 'asc',
      },
    });

    res.status(200).json({
      status: 'success',
      data: criteria,
    });
  } catch (error) {
    next(error);
  }
};

// Create new criterion
export const createCriterion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code, label, description, weight } = req.body;
    const user_id = (req as any).user.id;
    const user_role = (req as any).user.role;

    if (!['ADMIN'].includes(user_role)) {
      return next(new AppError('Access denied', 403));
    }

    // Check if code already exists
    const existingCriterion = await prisma.criterion.findUnique({
      where: { code },
    });

    if (existingCriterion) {
      return next(new AppError('Criterion with this code already exists', 400));
    }

    const criterion = await prisma.criterion.create({
      data: {
        code,
        label,
        description,
        weight: parseFloat(weight),
      },
    });

    // Log audit action
    await prisma.auditLog.create({
      data: {
        actor_id: user_id,
        action: 'CRITERION_CREATED',
        target_type: 'CRITERION',
        target_id: criterion.id,
        details: {
          code,
          label,
          weight,
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: criterion,
    });
  } catch (error) {
    next(error);
  }
};

// Update criterion
export const updateCriterion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { criterionId } = req.params;
    const { code, label, description, weight } = req.body;
    const user_id = (req as any).user.id;
    const user_role = (req as any).user.role;

    if (!['ADMIN'].includes(user_role)) {
      return next(new AppError('Access denied', 403));
    }

    const existingCriterion = await prisma.criterion.findUnique({
      where: { id: criterionId },
    });

    if (!existingCriterion) {
      return next(new AppError('Criterion not found', 404));
    }

    // Check if new code conflicts with existing
    if (code !== existingCriterion.code) {
      const codeExists = await prisma.criterion.findUnique({
        where: { code },
      });

      if (codeExists) {
        return next(new AppError('Criterion with this code already exists', 400));
      }
    }

    const criterion = await prisma.criterion.update({
      where: { id: criterionId },
      data: {
        code,
        label,
        description,
        weight: parseFloat(weight),
      },
    });

    // Log audit action
    await prisma.auditLog.create({
      data: {
        actor_id: user_id,
        action: 'CRITERION_UPDATED',
        target_type: 'CRITERION',
        target_id: criterion.id,
        details: {
          old_code: existingCriterion.code,
          new_code: code,
          old_weight: existingCriterion.weight,
          new_weight: weight,
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: criterion,
    });
  } catch (error) {
    next(error);
  }
};

// Delete criterion
export const deleteCriterion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { criterionId } = req.params;
    const user_id = (req as any).user.id;
    const user_role = (req as any).user.role;

    if (!['ADMIN'].includes(user_role)) {
      return next(new AppError('Access denied', 403));
    }

    const criterion = await prisma.criterion.findUnique({
      where: { id: criterionId },
    });

    if (!criterion) {
      return next(new AppError('Criterion not found', 404));
    }

    // Check if criterion is being used in reviews
    const reviewsUsingCriterion = await prisma.review.findFirst({
      where: {
        scores: {
          path: [criterion.code],
          not: null,
        },
      },
    });

    if (reviewsUsingCriterion) {
      return next(new AppError('Cannot delete criterion that is being used in reviews', 400));
    }

    await prisma.criterion.delete({
      where: { id: criterionId },
    });

    // Log audit action
    await prisma.auditLog.create({
      data: {
        actor_id: user_id,
        action: 'CRITERION_DELETED',
        target_type: 'CRITERION',
        target_id: criterionId,
        details: {
          code: criterion.code,
          label: criterion.label,
        },
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Criterion deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get criterion by ID
export const getCriterionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { criterionId } = req.params;

    const criterion = await prisma.criterion.findUnique({
      where: { id: criterionId },
    });

    if (!criterion) {
      return next(new AppError('Criterion not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: criterion,
    });
  } catch (error) {
    next(error);
  }
};
