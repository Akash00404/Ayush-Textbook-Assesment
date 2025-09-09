// Load environment from prisma/.env so Prisma can connect
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

// Import PrismaClient from backend's node_modules to ensure correct version
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient, UserRole, BookStatus, AssignmentStatus } = require('../node_modules/@prisma/client');
// Resolve bcrypt from backend's node_modules because this script runs from prisma/
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('../backend/node_modules/bcrypt');

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.committeeDecision.deleteMany();
  await prisma.aggregateResult.deleteMany();
  await prisma.review.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.book.deleteMany();
  await prisma.criterion.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding database...');

  // Create users
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@ncism.edu',
      password_hash: await bcrypt.hash('Admin@123', 10),
      role: UserRole.ADMIN,
      institution: 'NCISM Headquarters',
      created_at: new Date(),
      last_login: null,
    },
  });

  const secretariatUser = await prisma.user.create({
    data: {
      name: 'Secretariat User',
      email: 'secretariat@ncism.edu',
      password_hash: await bcrypt.hash('Secret@123', 10),
      role: UserRole.SECRETARIAT,
      institution: 'NCISM Headquarters',
      created_at: new Date(),
      last_login: null,
    },
  });

  const reviewerUser1 = await prisma.user.create({
    data: {
      name: 'Dr. Reviewer One',
      email: 'reviewer1@ncism.edu',
      password_hash: await bcrypt.hash('Review@123', 10),
      role: UserRole.REVIEWER,
      institution: 'Ayurveda College, Delhi',
      created_at: new Date(),
      last_login: null,
    },
  });

  const reviewerUser2 = await prisma.user.create({
    data: {
      name: 'Dr. Reviewer Two',
      email: 'reviewer2@ncism.edu',
      password_hash: await bcrypt.hash('Review@123', 10),
      role: UserRole.REVIEWER,
      institution: 'Unani Medical College, Hyderabad',
      created_at: new Date(),
      last_login: null,
    },
  });

  const committeeUser = await prisma.user.create({
    data: {
      name: 'Committee Member',
      email: 'committee@ncism.edu',
      password_hash: await bcrypt.hash('Committee@123', 10),
      role: UserRole.COMMITTEE,
      institution: 'NCISM Headquarters',
      created_at: new Date(),
      last_login: null,
    },
  });

  console.log('Created users');

  // Create criteria
  const criteria = await Promise.all([
    prisma.criterion.create({
      data: {
        code: 'CONT-1',
        label: 'Content Accuracy',
        description: 'Accuracy of the medical information presented in the textbook',
        weight: 0.25,
      },
    }),
    prisma.criterion.create({
      data: {
        code: 'CONT-2',
        label: 'Content Completeness',
        description: 'Completeness of the content as per syllabus requirements',
        weight: 0.20,
      },
    }),
    prisma.criterion.create({
      data: {
        code: 'PEDA-1',
        label: 'Pedagogical Approach',
        description: 'Effectiveness of teaching methods and learning aids',
        weight: 0.15,
      },
    }),
    prisma.criterion.create({
      data: {
        code: 'PRES-1',
        label: 'Presentation Quality',
        description: 'Quality of illustrations, tables, and overall presentation',
        weight: 0.15,
      },
    }),
    prisma.criterion.create({
      data: {
        code: 'LANG-1',
        label: 'Language Clarity',
        description: 'Clarity and accessibility of language used',
        weight: 0.15,
      },
    }),
    prisma.criterion.create({
      data: {
        code: 'REF-1',
        label: 'References & Citations',
        description: 'Quality and comprehensiveness of references and citations',
        weight: 0.10,
      },
    }),
  ]);

  console.log('Created criteria');

  // Create a sample book
  const sampleBook = await prisma.book.create({
    data: {
      title: 'Fundamentals of Ayurvedic Medicine',
      authors: 'Dr. Sharma, P.V. & Dr. Mishra, S.N.',
      publisher: 'Chaukhamba Publications',
      edition: '3rd Edition, 2023',
      syllabus_version: 'BAMS 2022 Curriculum',
      pdf_path: '/uploads/books/fundamentals_ayurvedic_medicine.pdf',
      uploaded_by: secretariatUser.id,
      status: BookStatus.PENDING_REVIEW,
    },
  });

  console.log('Created sample book');

  // Create assignments for the sample book
  const assignment1 = await prisma.assignment.create({
    data: {
      book_id: sampleBook.id,
      reviewer_id: reviewerUser1.id,
      assigned_by: secretariatUser.id,
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: AssignmentStatus.PENDING,
    },
  });

  const assignment2 = await prisma.assignment.create({
    data: {
      book_id: sampleBook.id,
      reviewer_id: reviewerUser2.id,
      assigned_by: secretariatUser.id,
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: AssignmentStatus.PENDING,
    },
  });

  console.log('Created assignments');

  // Create a sample audit log entry
  await prisma.auditLog.create({
    data: {
      actor_id: secretariatUser.id,
      action: 'BOOK_UPLOAD',
      target_type: 'Book',
      target_id: sampleBook.id,
      details: JSON.stringify({
        book_title: sampleBook.title,
        timestamp: new Date().toISOString(),
      }),
    },
  });

  console.log('Created sample audit log');

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });