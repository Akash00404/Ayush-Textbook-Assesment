import { Router } from 'express';
import { body } from 'express-validator';
import { 
  getCriteria, 
  createCriterion, 
  updateCriterion, 
  deleteCriterion, 
  getCriterionById 
} from '../controllers/criteria.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Validation middleware
const createValidation = [
  body('code').notEmpty().withMessage('Code is required'),
  body('label').notEmpty().withMessage('Label is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('weight').isFloat({ min: 0, max: 1 }).withMessage('Weight must be between 0 and 1'),
];

const updateValidation = [
  body('code').optional().notEmpty().withMessage('Code cannot be empty'),
  body('label').optional().notEmpty().withMessage('Label cannot be empty'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('weight').optional().isFloat({ min: 0, max: 1 }).withMessage('Weight must be between 0 and 1'),
];

// Routes
router.get('/', authenticate, getCriteria);
router.get('/:criterionId', authenticate, getCriterionById);
router.post('/create', authenticate, createValidation, createCriterion);
router.put('/:criterionId', authenticate, updateValidation, updateCriterion);
router.delete('/:criterionId', authenticate, deleteCriterion);

export default router;
