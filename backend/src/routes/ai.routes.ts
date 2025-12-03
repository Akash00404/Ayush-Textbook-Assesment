import { Router } from 'express';
import {
  generateSummary,
  detectReviewConflicts,
  generateActions,
  getAISummary,
  getConflicts,
  resolveConflict,
} from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

// Generate AI summary for a book
router.post('/books/:bookId/summary', generateSummary);

// Get AI summary for a book
router.get('/books/:bookId/summary', getAISummary);

// Detect conflicts in reviews
router.post('/books/:bookId/conflicts', detectReviewConflicts);

// Get conflicts for a book
router.get('/books/:bookId/conflicts', getConflicts);

// Resolve a conflict
router.patch('/conflicts/:conflictId/resolve', resolveConflict);

// Generate action suggestions
router.post('/books/:bookId/actions', generateActions);

export default router;

