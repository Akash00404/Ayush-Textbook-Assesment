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

// Get all assignments for the authenticated reviewer
export const getAssignments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        reviewer_id: req.user!.id,
      },
      include: {
        book: true,
        reviews: {
          where: {
            reviewer_id: req.user!.id,
          },
        },
      },
    });

    return res.status(200).json({
      status: 'success',
      results: assignments.length,
      data: {
        assignments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific assignment by ID
export const getAssignmentById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        book: true,
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
            email: true,
          },
        },
        reviews: true,
      },
    });

    if (!assignment) {
      return next(new AppError('Assignment not found', 404));
    }

    // Check if user has access to this assignment
    if (
      req.user!.role === UserRole.REVIEWER &&
      assignment.reviewer_id !== req.user!.id
    ) {
      return next(
        new AppError('You do not have access to this assignment', 403)
      );
    }

    return res.status(200).json({
      status: 'success',
      data: {
        assignment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update assignment fields (due date, status) - Admin/Secretariat only
export const updateAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { due_date, status } = req.body;

    const updateData: any = {};

    if (due_date) {
      updateData.due_date = new Date(due_date);
    }

    if (status) {
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return next(new AppError('No fields provided to update', 400));
    }

    const assignment = await prisma.assignment.update({
      where: { id },
      data: updateData,
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
    });

    return res.status(200).json({
      status: 'success',
      data: {
        assignment,
      },
    });
  } catch (error) {
    next(error);
  }
};