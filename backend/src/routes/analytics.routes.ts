import { Router } from 'express';
import { getReviewerMetrics, getSystemAnalytics, getAssignmentTracking } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Routes
router.get('/reviewer-metrics', authenticate, getReviewerMetrics);
router.get('/system', authenticate, getSystemAnalytics);
router.get('/assignment-tracking', authenticate, getAssignmentTracking);

export default router;
