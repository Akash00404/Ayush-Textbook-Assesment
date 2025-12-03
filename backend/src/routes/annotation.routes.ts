import { Router } from 'express';
import { body } from 'express-validator';
import { 
  createAnnotation, 
  getAnnotations, 
  updateAnnotation, 
  deleteAnnotation,
  uploadAnnotation 
} from '../controllers/annotation.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Validation middleware
const annotationValidation = [
  body('assignment_id').notEmpty().withMessage('Assignment ID is required'),
  body('page_number').isInt({ min: 1 }).withMessage('Page number must be a positive integer'),
  body('annotation_type').isIn(['highlight', 'comment', 'markup']).withMessage('Invalid annotation type'),
  body('content').optional().isString().withMessage('Content must be a string'),
  body('coordinates').optional().isString().withMessage('Coordinates must be a JSON string'),
];

const updateValidation = [
  body('content').optional().isString().withMessage('Content must be a string'),
  body('coordinates').optional().isString().withMessage('Coordinates must be a JSON string'),
];

// Routes
router.post('/create', authenticate, uploadAnnotation, annotationValidation, createAnnotation);
router.get('/assignment/:assignmentId', authenticate, getAnnotations);
router.put('/:annotationId', authenticate, updateValidation, updateAnnotation);
router.delete('/:annotationId', authenticate, deleteAnnotation);

export default router;
