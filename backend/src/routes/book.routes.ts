import express from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as bookController from '../controllers/book.controller';

enum UserRole {
  ADMIN = "ADMIN",
  SECRETARIAT = "SECRETARIAT",
  REVIEWER = "REVIEWER",
  COMMITTEE = "COMMITTEE"
}

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.UPLOAD_DIR || './uploads/books';
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (_) {}
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
});

// POST /books - Upload book metadata + PDF (Secretariat only)
router.post(
  '/',
  authenticate,
  authorize([UserRole.SECRETARIAT]),
  upload.single('pdf'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('authors').notEmpty().withMessage('Authors are required'),
    body('publisher').notEmpty().withMessage('Publisher is required'),
    body('edition').notEmpty().withMessage('Edition is required'),
    body('syllabus_version').notEmpty().withMessage('Syllabus version is required'),
  ],
  bookController.uploadBook
);

// GET /books/public/approved - Get approved books for public portal (no auth required)
router.get('/public/approved', bookController.getPublicApprovedBooks);

// GET /books - Get all books
router.get('/', authenticate, bookController.getAllBooks);

// GET /books/:id - Get a specific book
router.get('/:id', authenticate, bookController.getBookById);

// GET /books/:id/file - Serve the uploaded PDF
router.get('/:id/file', authenticate, bookController.getBookFile);

// POST /books/:id/assign - Assign reviewers (Secretariat only)
router.post(
  '/:id/assign',
  authenticate,
  authorize([UserRole.SECRETARIAT]),
  [
    body('reviewer_ids')
      .isArray()
      .withMessage('Reviewer IDs must be an array')
      .notEmpty()
      .withMessage('At least one reviewer must be assigned'),
    body('due_date').isISO8601().withMessage('Valid due date is required'),
  ],
  bookController.assignReviewers
);

// GET /books/:id/aggregate - Compute & return aggregated stats
router.get(
  '/:id/aggregate',
  authenticate,
  authorize([UserRole.SECRETARIAT, UserRole.COMMITTEE]),
  bookController.getAggregateStats
);

// POST /books/:id/decision - Committee records final decision
router.post(
  '/:id/decision',
  authenticate,
  authorize([UserRole.COMMITTEE]),
  [
    body('decision')
      .isIn(['APPROVED', 'REJECTED', 'NEEDS_REVISION'])
      .withMessage('Valid decision is required'),
    body('rationale').notEmpty().withMessage('Rationale is required'),
  ],
  bookController.recordDecision
);

export default router;