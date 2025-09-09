import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer';
import { prisma } from '../index';
import { AppError } from '../middleware/error.middleware';

// Generate a consolidated PDF report for a book
export const generateBookReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Find book by ID with all related data
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        uploader: true,
        assignments: {
          include: {
            reviewer: true,
            reviews: true,
          },
        },
        aggregate_results: {
          orderBy: {
            computed_at: 'desc',
          },
          take: 1,
        },
        committee_decisions: {
          include: {
            decider: true,
          },
          orderBy: {
            decided_at: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!book) {
      return next(new AppError('Book not found', 404));
    }

    // Check if book has completed reviews
    if (book.assignments.length === 0) {
      return next(new AppError('No assignments found for this book', 400));
    }

    const completedReviews = book.assignments
      .map((assignment: any) => assignment.reviews)
      .flat()
      .filter((review: any) => !review.draft_flag);

    if (completedReviews.length === 0) {
      return next(new AppError('No completed reviews found for this book', 400));
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'reports');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate HTML content for the report
    const htmlContent = generateReportHtml(book);

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Add NCISM logo and watermark
    await page.addStyleTag({
      content: `
        @page {
          margin: 1cm;
          size: A4;
        }
        body {
          position: relative;
          font-family: Arial, sans-serif;
        }
        body::after {
          content: 'NCISM CONFIDENTIAL';
          position: fixed;
          top: 50%;
          left: 0;
          right: 0;
          z-index: -1;
          font-size: 100px;
          color: rgba(200, 200, 200, 0.2);
          transform: rotate(-45deg);
          text-align: center;
        }
      `,
    });

    // Generate PDF file
    const pdfPath = path.join(uploadsDir, `book_report_${id}.pdf`);
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm',
      },
    });

    await browser.close();

    // Send the PDF file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${book.title.replace(/\s+/g, '_')}_report.pdf"`
    );

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// Helper function to generate HTML content for the report
const generateReportHtml = (book: any) => {
  // Extract data
  const { title, authors, publisher, edition, syllabus_version } = book;
  const uploader = book.uploader;
  const assignments = book.assignments;
  const aggregateResult = book.aggregate_results[0];
  const committeeDecision = book.committee_decisions[0];

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Generate reviewer sections
  const reviewerSections = assignments
    .map((assignment: any) => {
      const reviewer = assignment.reviewer;
      const review = assignment.reviews[0];

      if (!review || review.draft_flag) {
        return '';
      }

      const scores = review.scores as Record<string, number>;
      const comments = review.comments as Record<string, string>;

      const criteriaRows = Object.entries(scores)
        .map(
          ([code, score]) => `
          <tr>
            <td>${code}</td>
            <td>${score}</td>
            <td>${comments[code] || ''}</td>
          </tr>
        `
        )
        .join('');

      return `
        <div class="reviewer-section mb-8">
          <h3 class="text-xl font-bold mb-2">Reviewer: ${reviewer.name}</h3>
          <p class="mb-1"><strong>Institution:</strong> ${reviewer.institution || 'N/A'}</p>
          <p class="mb-4"><strong>Submitted:</strong> ${formatDate(review.submitted_at)}</p>
          
          <table class="w-full border-collapse border border-gray-300 mb-4">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-300 p-2">Criterion</th>
                <th class="border border-gray-300 p-2">Score (1-5)</th>
                <th class="border border-gray-300 p-2">Comments</th>
              </tr>
            </thead>
            <tbody>
              ${criteriaRows}
            </tbody>
          </table>
        </div>
      `;
    })
    .join('');

  // Generate aggregate stats section
  let aggregateStatsSection = '<p>No aggregate statistics available.</p>';
  if (aggregateResult) {
    const stats = aggregateResult.stats as Record<string, any>;

    const statsRows = Object.entries(stats)
      .map(
        ([code, stat]) => `
        <tr>
          <td>${code}</td>
          <td>${stat.mean.toFixed(2)}</td>
          <td>${stat.median}</td>
          <td>${stat.variance.toFixed(2)}</td>
          <td>${stat.min}</td>
          <td>${stat.max}</td>
        </tr>
      `
      )
      .join('');

    aggregateStatsSection = `
      <div class="stats-section mb-8">
        <h3 class="text-xl font-bold mb-4">Aggregated Statistics</h3>
        <table class="w-full border-collapse border border-gray-300 mb-4">
          <thead>
            <tr class="bg-gray-100">
              <th class="border border-gray-300 p-2">Criterion</th>
              <th class="border border-gray-300 p-2">Mean</th>
              <th class="border border-gray-300 p-2">Median</th>
              <th class="border border-gray-300 p-2">Variance</th>
              <th class="border border-gray-300 p-2">Min</th>
              <th class="border border-gray-300 p-2">Max</th>
            </tr>
          </thead>
          <tbody>
            ${statsRows}
          </tbody>
        </table>
        <div class="summary-text p-4 bg-gray-50 border border-gray-300 rounded">
          <h4 class="font-bold mb-2">Summary</h4>
          <p>${aggregateResult.summary_text}</p>
        </div>
      </div>
    `;
  }

  // Generate committee decision section
  let committeeDecisionSection = '<p>No committee decision available.</p>';
  if (committeeDecision) {
    const decisionClass =
      committeeDecision.decision === 'APPROVED'
        ? 'bg-green-100 border-green-300'
        : committeeDecision.decision === 'REJECTED'
        ? 'bg-red-100 border-red-300'
        : 'bg-yellow-100 border-yellow-300';

    committeeDecisionSection = `
      <div class="decision-section mb-8">
        <h3 class="text-xl font-bold mb-4">Committee Decision</h3>
        <div class="p-4 ${decisionClass} rounded border">
          <p class="font-bold mb-2">Decision: ${committeeDecision.decision}</p>
          <p class="mb-2"><strong>Decided by:</strong> ${committeeDecision.decider.name}</p>
          <p class="mb-2"><strong>Date:</strong> ${formatDate(committeeDecision.decided_at)}</p>
          <div class="mt-4">
            <h4 class="font-bold mb-2">Rationale:</h4>
            <p>${committeeDecision.rationale}</p>
          </div>
        </div>
      </div>
    `;
  }

  // Combine all sections into the final HTML
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Book Review Report: ${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }
        .logo {
          max-width: 200px;
          margin-bottom: 20px;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 10px;
        }
        h2 {
          font-size: 20px;
          margin-top: 30px;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
        h3 {
          font-size: 18px;
          margin-top: 25px;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px 12px;
          text-align: left;
        }
        th {
          background-color: #f5f5f5;
        }
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 8px; }
        .mb-4 { margin-bottom: 16px; }
        .mb-8 { margin-bottom: 32px; }
        .mt-4 { margin-top: 16px; }
        .p-2 { padding: 8px; }
        .p-4 { padding: 16px; }
        .w-full { width: 100%; }
        .font-bold { font-weight: bold; }
        .text-xl { font-size: 20px; }
        .bg-gray-50 { background-color: #fafafa; }
        .bg-gray-100 { background-color: #f5f5f5; }
        .bg-green-100 { background-color: #dcfce7; }
        .bg-red-100 { background-color: #fee2e2; }
        .bg-yellow-100 { background-color: #fef9c3; }
        .border { border-width: 1px; border-style: solid; }
        .border-gray-300 { border-color: #d1d5db; }
        .border-green-300 { border-color: #86efac; }
        .border-red-300 { border-color: #fca5a5; }
        .border-yellow-300 { border-color: #fde68a; }
        .rounded { border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">NCISM</div>
        <h1>Textbook Review Report</h1>
        <p>Generated on ${formatDate(new Date())}</p>
      </div>

      <div class="book-details mb-8">
        <h2>Book Details</h2>
        <table>
          <tr>
            <td><strong>Title:</strong></td>
            <td>${title}</td>
          </tr>
          <tr>
            <td><strong>Authors:</strong></td>
            <td>${authors}</td>
          </tr>
          <tr>
            <td><strong>Publisher:</strong></td>
            <td>${publisher}</td>
          </tr>
          <tr>
            <td><strong>Edition:</strong></td>
            <td>${edition}</td>
          </tr>
          <tr>
            <td><strong>Syllabus Version:</strong></td>
            <td>${syllabus_version}</td>
          </tr>
          <tr>
            <td><strong>Uploaded By:</strong></td>
            <td>${uploader.name}</td>
          </tr>
          <tr>
            <td><strong>Upload Date:</strong></td>
            <td>${formatDate(book.uploaded_at)}</td>
          </tr>
        </table>
      </div>

      <h2>Reviewer Assessments</h2>
      ${reviewerSections}

      <h2>Aggregated Results</h2>
      ${aggregateStatsSection}

      <h2>Committee Decision</h2>
      ${committeeDecisionSection}

      <div class="footer" style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
        <p>This report is confidential and intended for internal use by NCISM only.</p>
        <p>© ${new Date().getFullYear()} National Commission for Indian System of Medicine</p>
      </div>
    </body>
    </html>
  `;
};