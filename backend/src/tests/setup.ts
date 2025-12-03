import { PrismaClient } from '@prisma/client';

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/ncism_test';
});

afterAll(async () => {
  // Clean up any global resources
  const prisma = new PrismaClient();
  await prisma.$disconnect();
});

// Mock external services
jest.mock('../services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendAssignmentNotification: jest.fn().mockResolvedValue(true),
  sendReminderEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../services/sms.service', () => ({
  sendSMS: jest.fn().mockResolvedValue(true),
  sendAssignmentSMS: jest.fn().mockResolvedValue(true),
  sendReminderSMS: jest.fn().mockResolvedValue(true),
}));

jest.mock('../services/whatsapp.service', () => ({
  sendWhatsApp: jest.fn().mockResolvedValue(true),
  sendAssignmentWhatsApp: jest.fn().mockResolvedValue(true),
  sendReminderWhatsApp: jest.fn().mockResolvedValue(true),
}));

// Mock BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
  })),
}));

// Mock Tesseract.js
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn().mockResolvedValue({
    recognize: jest.fn().mockResolvedValue({
      data: { text: 'Mocked OCR text' },
    }),
    terminate: jest.fn().mockResolvedValue(undefined),
  }),
}));
