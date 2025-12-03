import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../index';
import { AppError } from '../middleware/error.middleware';

// Submit COI declaration
export const submitCOIDeclaration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { assignment_id, has_conflict, conflict_details } = req.body;
    const reviewer_id = (req as any).user.id;

    // Check if assignment exists and belongs to reviewer
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignment_id,
        reviewer_id: reviewer_id,
      },
      include: {
        book: true,
      },
    });

    if (!assignment) {
      return next(new AppError('Assignment not found or access denied', 404));
    }

    // Upsert COI declaration
    const coiDeclaration = await prisma.conflictOfInterest.upsert({
      where: {
        assignment_id_reviewer_id: {
          assignment_id,
          reviewer_id,
        },
      },
      update: {
        has_conflict: has_conflict,
        conflict_details: conflict_details || null,
        updated_at: new Date(),
      },
      create: {
        assignment_id,
        reviewer_id,
        has_conflict,
        conflict_details: conflict_details || null,
      },
    });

    // Log audit action
    await prisma.auditLog.create({
      data: {
        actor_id: reviewer_id,
        action: 'COI_DECLARATION_SUBMITTED',
        target_type: 'CONFLICT_OF_INTEREST',
        target_id: coiDeclaration.id,
        details: {
          has_conflict,
          assignment_id,
          book_title: assignment.book.title,
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: coiDeclaration,
    });
  } catch (error) {
    next(error);
  }
};

// Get COI declaration for an assignment
export const getCOIDeclaration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { assignmentId } = req.params;
    const reviewer_id = (req as any).user.id;

    const coiDeclaration = await prisma.conflictOfInterest.findFirst({
      where: {
        assignment_id: assignmentId,
        reviewer_id: reviewer_id,
      },
      include: {
        assignment: {
          include: {
            book: true,
          },
        },
      },
    });

    if (!coiDeclaration) {
      return res.status(404).json({
        status: 'error',
        message: 'COI declaration not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: coiDeclaration,
    });
  } catch (error) {
    next(error);
  }
};

// Get all COI declarations for Secretariat/Admin
export const getAllCOIDeclarations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, has_conflict } = req.query;
    const user_role = (req as any).user.role;

    if (!['ADMIN', 'SECRETARIAT'].includes(user_role)) {
      return next(new AppError('Access denied', 403));
    }

    const whereClause: any = {};
    if (has_conflict !== undefined) {
      whereClause.has_conflict = has_conflict === 'true';
    }

    const coiDeclarations = await prisma.conflictOfInterest.findMany({
      where: whereClause,
      include: {
        assignment: {
          include: {
            book: true,
            reviewer: true,
          },
        },
        reviewer: true,
      },
      orderBy: {
        declared_at: 'desc',
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const total = await prisma.conflictOfInterest.count({
      where: whereClause,
    });

    res.status(200).json({
      status: 'success',
      data: {
        declarations: coiDeclarations,
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
