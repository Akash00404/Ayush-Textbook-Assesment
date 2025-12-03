import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as auditController from '../controllers/audit.controller';

enum UserRole {
  ADMIN = "ADMIN",
  SECRETARIAT = "SECRETARIAT",
  REVIEWER = "REVIEWER",
  COMMITTEE = "COMMITTEE"
}

const router = express.Router();

// GET /audit - Admin fetches audit logs
router.get(
  '/',
  authenticate,
  authorize([UserRole.ADMIN]),
  auditController.getAuditLogs
);

export default router;