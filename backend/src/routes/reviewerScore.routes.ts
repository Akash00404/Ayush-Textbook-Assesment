import { Router } from 'express';
import {
  getReviewerScoreById,
  calculateScore,
  calculateAllScores,
  getAllReviewerScores,
} from '../controllers/reviewerScore.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get reviewer score
router.get('/reviewers/:reviewerId', getReviewerScoreById);

// Calculate/update reviewer score
router.post('/reviewers/:reviewerId/calculate', calculateScore);

// Get all reviewer scores (admin/secretariat only)
router.get('/reviewers', getAllReviewerScores);

// Calculate all reviewer scores (admin only)
router.post('/calculate-all', calculateAllScores);

export default router;

