import request from 'supertest';
import { app } from '../index';
import { prisma } from '../index';
import jwt from 'jsonwebtoken';

describe('COI Controller', () => {
  let authToken: string;
  let assignmentId: string;
  let reviewerId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Test Reviewer',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'REVIEWER',
      },
    });
    reviewerId = user.id;

    // Create test assignment
    const book = await prisma.book.create({
      data: {
        title: 'Test Book',
        authors: 'Test Author',
        publisher: 'Test Publisher',
        edition: '1st',
        syllabus_version: '2023',
        pdf_path: '/test/path.pdf',
        uploaded_by: user.id,
        status: 'PENDING_REVIEW',
      },
    });

    const assignment = await prisma.assignment.create({
      data: {
        book_id: book.id,
        reviewer_id: user.id,
        assigned_by: user.id,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'PENDING',
      },
    });
    assignmentId = assignment.id;

    // Generate auth token
    authToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.conflictOfInterest.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.book.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/coi/submit', () => {
    it('should submit COI declaration successfully', async () => {
      const response = await request(app)
        .post('/api/coi/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assignment_id: assignmentId,
          has_conflict: false,
          conflict_details: null,
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.has_conflict).toBe(false);
    });

    it('should submit COI declaration with conflict details', async () => {
      const response = await request(app)
        .post('/api/coi/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assignment_id: assignmentId,
          has_conflict: true,
          conflict_details: 'I know the author personally',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.has_conflict).toBe(true);
      expect(response.body.data.conflict_details).toBe('I know the author personally');
    });

    it('should return 400 for invalid assignment', async () => {
      const response = await request(app)
        .post('/api/coi/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assignment_id: 'invalid-id',
          has_conflict: false,
        })
        .expect(404);

      expect(response.body.message).toContain('Assignment not found');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/coi/submit')
        .send({
          assignment_id: assignmentId,
          has_conflict: false,
        })
        .expect(401);
    });
  });

  describe('GET /api/coi/assignment/:assignmentId', () => {
    it('should get COI declaration for assignment', async () => {
      const response = await request(app)
        .get(`/api/coi/assignment/${assignmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('assignment_id', assignmentId);
    });

    it('should return 404 for non-existent COI declaration', async () => {
      // Create another assignment without COI
      const book = await prisma.book.create({
        data: {
          title: 'Another Test Book',
          authors: 'Another Author',
          publisher: 'Test Publisher',
          edition: '1st',
          syllabus_version: '2023',
          pdf_path: '/test/path2.pdf',
          uploaded_by: reviewerId,
          status: 'PENDING_REVIEW',
        },
      });

      const assignment = await prisma.assignment.create({
        data: {
          book_id: book.id,
          reviewer_id: reviewerId,
          assigned_by: reviewerId,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'PENDING',
        },
      });

      const response = await request(app)
        .get(`/api/coi/assignment/${assignment.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toContain('COI declaration not found');
    });
  });
});
