import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as reportController from '../controllers/report.controller';

enum UserRole {
  ADMIN = "ADMIN",
  SECRETARIAT = "SECRETARIAT",
  REVIEWER = "REVIEWER",
  COMMITTEE = "COMMITTEE"
}

const router = express.Router();

// GET /reports/books/:id.pdf - Generate consolidated PDF report
router.get(
  '/books/:id.pdf',
  authenticate,
  authorize([UserRole.SECRETARIAT, UserRole.COMMITTEE]),
  reportController.generateBookReport
);

export default router;