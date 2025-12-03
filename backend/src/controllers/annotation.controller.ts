import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../index';
import { AppError } from '../middleware/error.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for annotation file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.ANNOTATION_UPLOAD_DIR || './uploads/annotations';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `annotation-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  },
});

export const uploadAnnotation = upload.single('file');

// Create annotation
export const createAnnotation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { assignment_id, page_number, annotation_type, content, coordinates } = req.body;
    const reviewer_id = (req as any).user.id;

    // Check if assignment exists and belongs to reviewer
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignment_id,
        reviewer_id: reviewer_id,
      },
    });

    if (!assignment) {
      return next(new AppError('Assignment not found or access denied', 404));
    }

    const file_path = req.file ? req.file.path : null;

    const annotation = await prisma.annotation.create({
      data: {
        assignment_id,
        reviewer_id,
        file_path,
        page_number: parseInt(page_number),
        annotation_type,
        content: content || null,
        coordinates: coordinates ? JSON.parse(coordinates) : null,
      },
    });

    // Log audit action
    await prisma.auditLog.create({
      data: {
        actor_id: reviewer_id,
        action: 'ANNOTATION_CREATED',
        target_type: 'ANNOTATION',
        target_id: annotation.id,
        details: {
          assignment_id,
          page_number,
          annotation_type,
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: annotation,
    });
  } catch (error) {
    next(error);
  }
};

// Get annotations for an assignment
export const getAnnotations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { assignmentId } = req.params;
    const reviewer_id = (req as any).user.id;

    // Check if assignment exists and belongs to reviewer
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        reviewer_id: reviewer_id,
      },
    });

    if (!assignment) {
      return next(new AppError('Assignment not found or access denied', 404));
    }

    const annotations = await prisma.annotation.findMany({
      where: {
        assignment_id: assignmentId,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    res.status(200).json({
      status: 'success',
      data: annotations,
    });
  } catch (error) {
    next(error);
  }
};

// Update annotation
export const updateAnnotation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { annotationId } = req.params;
    const { content, coordinates } = req.body;
    const reviewer_id = (req as any).user.id;

    const annotation = await prisma.annotation.findFirst({
      where: {
        id: annotationId,
        reviewer_id: reviewer_id,
      },
    });

    if (!annotation) {
      return next(new AppError('Annotation not found or access denied', 404));
    }

    const updatedAnnotation = await prisma.annotation.update({
      where: {
        id: annotationId,
      },
      data: {
        content: content || annotation.content,
        coordinates: coordinates ? JSON.parse(coordinates) : annotation.coordinates,
      },
    });

    res.status(200).json({
      status: 'success',
      data: updatedAnnotation,
    });
  } catch (error) {
    next(error);
  }
};

// Delete annotation
export const deleteAnnotation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { annotationId } = req.params;
    const reviewer_id = (req as any).user.id;

    const annotation = await prisma.annotation.findFirst({
      where: {
        id: annotationId,
        reviewer_id: reviewer_id,
      },
    });

    if (!annotation) {
      return next(new AppError('Annotation not found or access denied', 404));
    }

    // Delete file if exists
    if (annotation.file_path && fs.existsSync(annotation.file_path)) {
      fs.unlinkSync(annotation.file_path);
    }

    await prisma.annotation.delete({
      where: {
        id: annotationId,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Annotation deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
