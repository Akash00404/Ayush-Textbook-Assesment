import { Router } from 'express';
import { body } from 'express-validator';
import { submitCOIDeclaration, getCOIDeclaration, getAllCOIDeclarations } from '../controllers/coi.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Validation middleware
const coiValidation = [
  body('assignment_id').notEmpty().withMessage('Assignment ID is required'),
  body('has_conflict').isBoolean().withMessage('Has conflict must be a boolean'),
  body('conflict_details').optional().isString().withMessage('Conflict details must be a string'),
];

// Routes
router.post('/submit', authenticate, coiValidation, submitCOIDeclaration);
router.get('/assignment/:assignmentId', authenticate, getCOIDeclaration);
router.get('/all', authenticate, getAllCOIDeclarations);

export default router;
