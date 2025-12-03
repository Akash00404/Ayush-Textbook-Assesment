import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as assignmentController from '../controllers/assignment.controller';

enum UserRole {
  ADMIN = "ADMIN",
  SECRETARIAT = "SECRETARIAT",
  REVIEWER = "REVIEWER",
  COMMITTEE = "COMMITTEE"
}

const router = express.Router();

// GET /assignments - Reviewer fetches assigned books
router.get(
  '/',
  authenticate,
  authorize([UserRole.REVIEWER]),
  assignmentController.getAssignments
);

// GET /assignments/:id - Get a specific assignment
router.get(
  '/:id',
  authenticate,
  assignmentController.getAssignmentById
);

// PATCH /assignments/:id - Update assignment (Admin/Secretariat)
router.patch(
  '/:id',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SECRETARIAT]),
  [
    body('due_date')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid ISO date'),
    body('status')
      .optional()
      .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED'])
      .withMessage('Invalid assignment status'),
  ],
  assignmentController.updateAssignment
);

export default router;