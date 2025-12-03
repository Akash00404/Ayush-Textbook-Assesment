import { Router } from 'express';
import { body } from 'express-validator';
import { 
  createReminder, 
  getReminders, 
  getUserReminders, 
  updateReminderStatus, 
  cancelReminder 
} from '../controllers/reminder.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Validation middleware
const reminderValidation = [
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('type').isIn(['ASSIGNMENT_DUE', 'ASSIGNMENT_OVERDUE', 'REVIEW_SUBMISSION_REMINDER', 'COMMITTEE_DECISION_DUE', 'CUSTOM']).withMessage('Invalid reminder type'),
  body('message').notEmpty().withMessage('Message is required'),
  body('scheduled_for').isISO8601().withMessage('Scheduled date must be a valid ISO 8601 date'),
  body('channel').isIn(['EMAIL', 'SMS', 'WHATSAPP', 'IN_APP']).withMessage('Invalid channel'),
  body('assignment_id').optional().isString().withMessage('Assignment ID must be a string'),
  body('metadata').optional().isString().withMessage('Metadata must be a JSON string'),
];

const statusValidation = [
  body('status').isIn(['PENDING', 'SENT', 'FAILED', 'CANCELLED']).withMessage('Invalid status'),
];

// Routes
router.post('/create', authenticate, reminderValidation, createReminder);
router.get('/all', authenticate, getReminders);
router.get('/user', authenticate, getUserReminders);
router.put('/:reminderId/status', authenticate, statusValidation, updateReminderStatus);
router.put('/:reminderId/cancel', authenticate, cancelReminder);

export default router;
