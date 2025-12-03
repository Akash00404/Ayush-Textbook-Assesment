import { Router } from 'express';
import { processOCR, searchOCRContent, getOCRStatus } from '../controllers/ocr.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Routes
router.post('/process/:bookId', authenticate, processOCR);
router.get('/search', authenticate, searchOCRContent);
router.get('/status/:bookId', authenticate, getOCRStatus);

export default router;
