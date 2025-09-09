import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';

const router = express.Router();

// POST /auth/login - Authenticate user and return JWT
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  authController.login
);

export default router;