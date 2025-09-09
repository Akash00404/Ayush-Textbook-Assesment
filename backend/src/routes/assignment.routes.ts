import express from 'express';
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

export default router;