import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from './routes/auth.routes';
import bookRoutes from './routes/book.routes';
import assignmentRoutes from './routes/assignment.routes';
import reviewRoutes from './routes/review.routes';
import reportRoutes from './routes/report.routes';
import auditRoutes from './routes/audit.routes';
// Phase 2 routes
import coiRoutes from './routes/coi.routes';
import annotationRoutes from './routes/annotation.routes';
import reminderRoutes from './routes/reminder.routes';
import ocrRoutes from './routes/ocr.routes';
import analyticsRoutes from './routes/analytics.routes';
import criteriaRoutes from './routes/criteria.routes';
import aiRoutes from './routes/ai.routes';
import reviewerScoreRoutes from './routes/reviewerScore.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { auditLogger } from './middleware/audit.middleware';

// Import job processors
import './services/jobProcessor';

// Load environment variables
dotenv.config();

// Initialize Prisma client
export const prisma = new PrismaClient();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Audit logging middleware
app.use(auditLogger);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);
// Phase 2 routes
app.use('/api/coi', coiRoutes);
app.use('/api/annotations', annotationRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/criteria', criteriaRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reviewer-scores', reviewerScoreRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export app for testing
export { app };

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('Server shut down gracefully');
  process.exit(0);
});