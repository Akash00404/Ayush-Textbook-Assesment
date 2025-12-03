import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../index';
import { AppError } from '../middleware/error.middleware';
import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { Queue } from 'bullmq';

// Initialize OCR queue only if enabled
const queuesEnabled: boolean = (process.env.REDIS_ENABLED || '').toLowerCase() === 'true';
const ocrQueue: Queue | undefined = queuesEnabled
  ? new Queue('ocr-queue', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    })
  : undefined;

// Process OCR for a book
export const processOCR = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookId } = req.params;
    const user_role = (req as any).user.role;

    if (!['ADMIN', 'SECRETARIAT'].includes(user_role)) {
      return next(new AppError('Access denied', 403));
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return next(new AppError('Book not found', 404));
    }

    // Add OCR job to queue if enabled
    if (ocrQueue) {
      await ocrQueue.add(
        'process-ocr',
        {
          bookId,
          pdfPath: book.pdf_path,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      );
    }

    res.status(200).json({
      status: 'success',
      message: 'OCR processing started',
    });
  } catch (error) {
    next(error);
  }
};

// Search in OCR content
export const searchOCRContent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { query, bookId, page, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required',
      });
    }

    const whereClause: any = {
      content: {
        contains: query as string,
        mode: 'insensitive',
      },
    };

    if (bookId) {
      whereClause.book_id = bookId as string;
    }

    const results = await prisma.oCRIndex.findMany({
      where: whereClause,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            authors: true,
          },
        },
      },
      orderBy: {
        confidence: 'desc',
      },
      skip: page ? (Number(page) - 1) * Number(limit) : 0,
      take: Number(limit),
    });

    const total = await prisma.oCRIndex.count({
      where: whereClause,
    });

    res.status(200).json({
      status: 'success',
      data: {
        results,
        pagination: {
          page: page ? Number(page) : 1,
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

// Get OCR status for a book
export const getOCRStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookId } = req.params;

    const ocrCount = await prisma.oCRIndex.count({
      where: { book_id: bookId },
    });

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        title: true,
        pdf_path: true,
      },
    });

    if (!book) {
      return next(new AppError('Book not found', 404));
    }

    // Check if PDF exists
    const pdfExists = fs.existsSync(book.pdf_path);

    res.status(200).json({
      status: 'success',
      data: {
        book_id: bookId,
        title: book.title,
        pdf_exists: pdfExists,
        pages_processed: ocrCount,
        is_processed: ocrCount > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Process OCR job (called by queue worker)
export const processOCRJob = async (job: any) => {
  try {
    const { bookId, pdfPath } = job.data;

    if (!fs.existsSync(pdfPath)) {
      throw new Error('PDF file not found');
    }

    // Initialize Tesseract worker
    const worker = await createWorker('eng+hin+ara', 1, {
      logger: (m) => console.log(m),
    });

    // For now, we'll process the first page as an example
    // In production, you'd use a PDF-to-image library to convert each page
    // and then process each image with Tesseract

    // This is a simplified example - in reality, you'd need to:
    // 1. Convert PDF pages to images using pdf2pic or similar
    // 2. Process each image with Tesseract
    // 3. Store the results in the database

    const { data: { text } } = await worker.recognize(pdfPath);
    
    // Store OCR result
    await prisma.oCRIndex.create({
      data: {
        book_id: bookId,
        page_number: 1,
        content: text,
        confidence: 0.8, // This would be calculated from Tesseract
        language: 'eng',
      },
    });

    await worker.terminate();

    console.log(`OCR processing completed for book ${bookId}`);
  } catch (error) {
    console.error('Error processing OCR:', error);
    throw error;
  }
};
