import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as reviewController from '../controllers/review.controller';

enum UserRole {
  ADMIN = "ADMIN",
  SECRETARIAT = "SECRETARIAT",
  REVIEWER = "REVIEWER",
  COMMITTEE = "COMMITTEE"
}

const router = express.Router();

// POST /assignments/:id/review - Submit structured review
router.post(
  '/:id/review',
  authenticate,
  authorize([UserRole.REVIEWER]),
  [
    body('scores')
      .isObject()
      .withMessage('Scores must be an object mapping criteria to scores'),
    body('comments')
      .isObject()
      .withMessage('Comments must be an object mapping criteria to comments'),
    body('draft_flag')
      .isBoolean()
      .withMessage('Draft flag must be a boolean'),
  ],
  reviewController.submitReview
);

// GET /reviews/:id - Get a specific review
router.get(
  '/:id',
  authenticate,
  reviewController.getReviewById
);

export default router;