import request from 'supertest';
import { app } from '../index';
import { prisma } from '../index';
import jwt from 'jsonwebtoken';

describe('Analytics Controller', () => {
  let adminToken: string;
  let secretariatToken: string;
  let reviewerToken: string;
  let adminId: string;
  let secretariatId: string;
  let reviewerId: string;

  beforeAll(async () => {
    // Create test users
    const admin = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        role: 'ADMIN',
      },
    });
    adminId = admin.id;

    const secretariat = await prisma.user.create({
      data: {
        name: 'Test Secretariat',
        email: 'secretariat@example.com',
        password_hash: 'hashed_password',
        role: 'SECRETARIAT',
      },
    });
    secretariatId = secretariat.id;

    const reviewer = await prisma.user.create({
      data: {
        name: 'Test Reviewer',
        email: 'reviewer@example.com',
        password_hash: 'hashed_password',
        role: 'REVIEWER',
      },
    });
    reviewerId = reviewer.id;

    // Generate auth tokens
    adminToken = jwt.sign(
      { id: adminId, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    secretariatToken = jwt.sign(
      { id: secretariatId, email: secretariat.email, role: secretariat.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    reviewerToken = jwt.sign(
      { id: reviewerId, email: reviewer.email, role: reviewer.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test data
    const book = await prisma.book.create({
      data: {
        title: 'Test Book',
        authors: 'Test Author',
        publisher: 'Test Publisher',
        edition: '1st',
        syllabus_version: '2023',
        pdf_path: '/test/path.pdf',
        uploaded_by: secretariatId,
        status: 'PENDING_REVIEW',
      },
    });

    const assignment = await prisma.assignment.create({
      data: {
        book_id: book.id,
        reviewer_id: reviewerId,
        assigned_by: secretariatId,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
      },
    });

    // Create reviewer metrics
    await prisma.reviewerMetrics.create({
      data: {
        reviewer_id: reviewerId,
        total_assignments: 5,
        completed_assignments: 4,
        overdue_assignments: 1,
        average_turnaround: 48.5,
        reliability_score: 80.0,
        acceptance_rate: 75.0,
        rejection_rate: 25.0,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.reviewerMetrics.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.book.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('GET /api/analytics/reviewer-metrics', () => {
    it('should get reviewer metrics for admin', async () => {
      const response = await request(app)
        .get('/api/analytics/reviewer-metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const reviewer = response.body.data[0];
      expect(reviewer).toHaveProperty('reviewer');
      expect(reviewer).toHaveProperty('total_assignments');
      expect(reviewer).toHaveProperty('completed_assignments');
      expect(reviewer).toHaveProperty('reliability_score');
    });

    it('should get reviewer metrics for secretariat', async () => {
      const response = await request(app)
        .get('/api/analytics/reviewer-metrics')
        .set('Authorization', `Bearer ${secretariatToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should return 403 for reviewer', async () => {
      const response = await request(app)
        .get('/api/analytics/reviewer-metrics')
        .set('Authorization', `Bearer ${reviewerToken}`)
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });
  });

  describe('GET /api/analytics/system', () => {
    it('should get system analytics for admin', async () => {
      const response = await request(app)
        .get('/api/analytics/system')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('overview');
      expect(response.body.data.overview).toHaveProperty('totalBooks');
      expect(response.body.data.overview).toHaveProperty('totalUsers');
      expect(response.body.data.overview).toHaveProperty('totalAssignments');
    });

    it('should get system analytics for secretariat', async () => {
      const response = await request(app)
        .get('/api/analytics/system')
        .set('Authorization', `Bearer ${secretariatToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should return 403 for reviewer', async () => {
      const response = await request(app)
        .get('/api/analytics/system')
        .set('Authorization', `Bearer ${reviewerToken}`)
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });
  });

  describe('GET /api/analytics/assignment-tracking', () => {
    it('should get assignment tracking for admin', async () => {
      const response = await request(app)
        .get('/api/analytics/assignment-tracking')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('assignments');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.assignments)).toBe(true);
    });

    it('should filter assignments by status', async () => {
      const response = await request(app)
        .get('/api/analytics/assignment-tracking?status=PENDING')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      // All returned assignments should have PENDING status
      response.body.data.assignments.forEach((assignment: any) => {
        expect(assignment.status).toBe('PENDING');
      });
    });

    it('should return 403 for reviewer', async () => {
      const response = await request(app)
        .get('/api/analytics/assignment-tracking')
        .set('Authorization', `Bearer ${reviewerToken}`)
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });
  });
});
