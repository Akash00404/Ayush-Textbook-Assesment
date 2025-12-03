import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../index';
import { AppError } from '../middleware/error.middleware';
import { Queue } from 'bullmq';
import { sendEmail } from '../services/email.service';
import { sendSMS } from '../services/sms.service';
import { sendWhatsApp } from '../services/whatsapp.service';

// Initialize reminder queue only if enabled
const queuesEnabled: boolean = (process.env.REDIS_ENABLED || '').toLowerCase() === 'true';
const reminderQueue: Queue | undefined = queuesEnabled
  ? new Queue('reminder-queue', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    })
  : undefined;

// Create reminder
export const createReminder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      assignment_id,
      user_id,
      type,
      message,
      scheduled_for,
      channel,
      metadata,
    } = req.body;

    const reminder = await prisma.reminder.create({
      data: {
        assignment_id: assignment_id || null,
        user_id,
        type,
        message,
        scheduled_for: new Date(scheduled_for),
        channel,
        metadata: metadata ? JSON.parse(metadata) : null,
      },
    });

    // Add job to queue if enabled
    if (reminderQueue) {
      await reminderQueue.add(
        'send-reminder',
        {
          reminderId: reminder.id,
          type,
          channel,
          user_id,
          message,
          metadata: reminder.metadata,
        },
        {
          delay: new Date(scheduled_for).getTime() - Date.now(),
        }
      );
    }

    res.status(201).json({
      status: 'success',
      data: reminder,
    });
  } catch (error) {
    next(error);
  }
};

// Get reminders for Secretariat/Admin
export const getReminders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, status, type, channel } = req.query;
    const user_role = (req as any).user.role;

    if (!['ADMIN', 'SECRETARIAT'].includes(user_role)) {
      return next(new AppError('Access denied', 403));
    }

    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;
    if (channel) whereClause.channel = channel;

    const reminders = await prisma.reminder.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignment: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduled_for: 'desc',
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const total = await prisma.reminder.count({
      where: whereClause,
    });

    res.status(200).json({
      status: 'success',
      data: {
        reminders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get user's reminders
export const getUserReminders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user_id = (req as any).user.id;
    const { status } = req.query;

    const whereClause: any = { user_id };
    if (status) whereClause.status = status;

    const reminders = await prisma.reminder.findMany({
      where: whereClause,
      include: {
        assignment: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduled_for: 'desc',
      },
    });

    res.status(200).json({
      status: 'success',
      data: reminders,
    });
  } catch (error) {
    next(error);
  }
};

// Update reminder status
export const updateReminderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { reminderId } = req.params;
    const { status } = req.body;

    const reminder = await prisma.reminder.update({
      where: {
        id: reminderId,
      },
      data: {
        status,
        sent_at: status === 'SENT' ? new Date() : null,
      },
    });

    res.status(200).json({
      status: 'success',
      data: reminder,
    });
  } catch (error) {
    next(error);
  }
};

// Cancel reminder
export const cancelReminder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { reminderId } = req.params;

    const reminder = await prisma.reminder.update({
      where: {
        id: reminderId,
      },
      data: {
        status: 'CANCELLED',
      },
    });

    // Remove from queue if not yet processed
    if (reminderQueue) {
      const jobs = await reminderQueue.getJobs(['waiting', 'delayed']);
      for (const job of jobs) {
        if (job.data.reminderId === reminderId) {
          await job.remove();
          break;
        }
      }
    }

    res.status(200).json({
      status: 'success',
      data: reminder,
    });
  } catch (error) {
    next(error);
  }
};

// Process reminder (called by queue worker)
export const processReminder = async (job: any) => {
  try {
    const { reminderId, type, channel, user_id, message, metadata } = job.data;

    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId },
      include: {
        user: true,
        assignment: {
          include: {
            book: true,
          },
        },
      },
    });

    if (!reminder || reminder.status !== 'PENDING') {
      return;
    }

    let sent = false;

    switch (channel) {
      case 'EMAIL':
        sent = await sendEmail({
          to: reminder.user.email,
          subject: `Reminder: ${type}`,
          text: message,
          html: `<p>${message}</p>`,
        });
        break;

      case 'SMS':
        sent = await sendSMS({
          to: reminder.user.phone || '',
          message,
        });
        break;

      case 'WHATSAPP':
        sent = await sendWhatsApp({
          to: reminder.user.phone || '',
          message,
        });
        break;

      case 'IN_APP':
        // In-app notifications would be handled by WebSocket or similar
        sent = true;
        break;
    }

    await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: sent ? 'SENT' : 'FAILED',
        sent_at: sent ? new Date() : null,
      },
    });
  } catch (error) {
    console.error('Error processing reminder:', error);
    await prisma.reminder.update({
      where: { id: job.data.reminderId },
      data: {
        status: 'FAILED',
        error_message: error.message,
      },
    });
  }
};
