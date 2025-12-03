import { Worker } from 'bullmq';
import { processReminder } from '../controllers/reminder.controller';
import { processOCRJob } from '../controllers/ocr.controller';
import { prisma } from '../index';

// Toggle background workers via env. Set REDIS_ENABLED=false to disable when Redis is not available.
const workersEnabled: boolean = (process.env.REDIS_ENABLED || '').toLowerCase() === 'true';

let reminderWorker: Worker | undefined;
let ocrWorker: Worker | undefined;

if (workersEnabled) {
  // Initialize reminder worker
  reminderWorker = new Worker(
    'reminder-queue',
    async (job) => {
      console.log(`Processing reminder job: ${job.id}`);
      await processReminder(job);
    },
    {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }
  );

  // Initialize OCR worker
  ocrWorker = new Worker(
    'ocr-queue',
    async (job) => {
      console.log(`Processing OCR job: ${job.id}`);
      await processOCRJob(job);
    },
    {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }
  );
} else {
  console.log('Background job processors are disabled. Set REDIS_ENABLED=true to enable.');
}

// Error handling
reminderWorker?.on('error', (error) => {
  console.error('Reminder worker error:', error);
});

ocrWorker?.on('error', (error) => {
  console.error('OCR worker error:', error);
});

// Job completion handling
reminderWorker?.on('completed', async (job) => {
  console.log(`Reminder job ${job.id} completed`);
  
  // Update job status in database
  await prisma.backgroundJob.updateMany({
    where: {
      payload: {
        path: ['reminderId'],
        equals: job.data.reminderId,
      },
    },
    data: {
      status: 'COMPLETED',
      completed_at: new Date(),
    },
  });
});

ocrWorker?.on('completed', async (job) => {
  console.log(`OCR job ${job.id} completed`);
  
  // Update job status in database
  await prisma.backgroundJob.updateMany({
    where: {
      payload: {
        path: ['bookId'],
        equals: job.data.bookId,
      },
    },
    data: {
      status: 'COMPLETED',
      completed_at: new Date(),
    },
  });
});

// Job failure handling
reminderWorker?.on('failed', async (job, error) => {
  console.error(`Reminder job ${job?.id} failed:`, error);
  
  if (job) {
    await prisma.backgroundJob.updateMany({
      where: {
        payload: {
          path: ['reminderId'],
          equals: job.data.reminderId,
        },
      },
      data: {
        status: 'FAILED',
        error_message: error.message,
        retry_count: {
          increment: 1,
        },
      },
    });
  }
});

ocrWorker?.on('failed', async (job, error) => {
  console.error(`OCR job ${job?.id} failed:`, error);
  
  if (job) {
    await prisma.backgroundJob.updateMany({
      where: {
        payload: {
          path: ['bookId'],
          equals: job.data.bookId,
        },
      },
      data: {
        status: 'FAILED',
        error_message: error.message,
        retry_count: {
          increment: 1,
        },
      },
    });
  }
});

if (workersEnabled) {
  console.log('Background job processors started');
}

export { reminderWorker, ocrWorker };
