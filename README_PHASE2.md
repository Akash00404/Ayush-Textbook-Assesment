# NCISM Textbook Review System - Phase 2

## Overview

Phase 2 extends the NCISM textbook review application with advanced features for enhanced reviewer workflow, Secretariat management, reporting & analytics, document handling, and admin tools.

## New Features

### 1. Reviewer Workflow Improvements

#### Conflict of Interest (COI) Declaration
- **Mandatory COI declaration** before submitting any review
- **COI form** with conflict details text area
- **COI tracking** in assignment management
- **API endpoints**: `/api/coi/*`

#### PDF Annotation System
- **Upload marked-up versions** of books (images, PDFs)
- **Annotation types**: highlight, comment, markup
- **Page-specific annotations** with coordinates
- **File upload support** for annotation attachments
- **API endpoints**: `/api/annotations/*`

#### Draft Review System
- **Edit drafts** until submission deadline
- **Draft flag** in review submissions
- **Draft management** in reviewer interface

### 2. Secretariat Dashboard

#### Assignment Tracking
- **Real-time status tracking**: pending, in-progress, submitted, overdue
- **Deadline monitoring** with visual indicators
- **COI status tracking** for each assignment
- **Review progress indicators**

#### Reminder System
- **Automated reminders** via email, SMS, WhatsApp
- **Configurable reminder types**:
  - Assignment due
  - Assignment overdue
  - Review submission reminder
  - Committee decision due
- **Scheduled reminders** with queue processing
- **API endpoints**: `/api/reminders/*`

### 3. Reporting & Analytics

#### Configurable Report Builder
- **PDF template system** with JSON configuration
- **Multilingual support** for Ayurveda/Unani/Siddha terms
- **Template management** with CRUD operations
- **Dynamic report generation**

#### Reviewer Performance Analytics
- **Average review turnaround time**
- **Reviewer reliability scores** (0-100%)
- **Acceptance/rejection rates**
- **Assignment completion statistics**
- **API endpoints**: `/api/analytics/*`

### 4. Document Handling

#### OCR Service Integration
- **Tesseract.js integration** for PDF text extraction
- **Multi-language support** (English, Hindi, Arabic)
- **Confidence scoring** for OCR results
- **Background processing** with job queues
- **API endpoints**: `/api/ocr/*`

#### In-App Search
- **Full-text search** across book content
- **Search within specific books**
- **Highlighted search results**
- **Pagination support**
- **Real-time search interface**

### 5. Admin Tools

#### Dynamic Rubric Management
- **CRUD operations** for review criteria
- **Weight management** (0-1 scale)
- **Code-based criteria** with labels and descriptions
- **Real-time updates** in reviewer forms
- **API endpoints**: `/api/criteria/*`

## Technical Architecture

### Backend Enhancements

#### New Dependencies
```json
{
  "bullmq": "^4.15.0",
  "ioredis": "^5.3.2",
  "tesseract.js": "^4.1.1",
  "twilio": "^4.19.0",
  "whatsapp-web.js": "^1.23.0"
}
```

#### Database Schema Extensions
- **Conflict of Interest**: `conflict_of_interest` table
- **Annotations**: `annotations` table with file storage
- **OCR Index**: `ocr_index` table for searchable content
- **Reminders**: `reminders` table with scheduling
- **Reviewer Metrics**: `reviewer_metrics` table
- **Report Templates**: `report_templates` table
- **Background Jobs**: `background_jobs` table

#### Background Job Processing
- **BullMQ** for job queue management
- **Redis** for queue storage
- **Worker processes** for:
  - OCR processing
  - Reminder sending
  - Email/SMS/WhatsApp notifications

#### External Service Integrations
- **Email Service**: Nodemailer with SMTP
- **SMS Service**: Twilio integration
- **WhatsApp Service**: WhatsApp Web.js
- **OCR Service**: Tesseract.js with multi-language support

### Frontend Enhancements

#### New Dependencies
```json
{
  "react-pdf-annotate": "^0.0.1",
  "fuse.js": "^6.6.2",
  "date-fns": "^2.30.0"
}
```

#### New Components
- **COIDeclarationModal**: Conflict of interest declaration
- **AnnotationToolbar**: PDF annotation interface
- **AssignmentTrackingTable**: Secretariat assignment management
- **OCRSearch**: Full-text search interface
- **CriteriaManager**: Admin criteria management
- **SecretariatDashboard**: Enhanced Secretariat interface
- **AdminPage**: Admin panel with analytics

#### Enhanced Pages
- **ReviewPage**: COI declaration and annotation support
- **Dashboard**: Role-based navigation and analytics

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis (for background jobs)
- SMTP server (for email notifications)
- Twilio account (for SMS)
- WhatsApp Business API (optional)

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ncism_review"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@ncism.edu

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp
WHATSAPP_ENABLED=true

# File Uploads
UPLOAD_DIR=./uploads/books
ANNOTATION_UPLOAD_DIR=./uploads/annotations
MAX_FILE_SIZE=10485760

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=1d
```

### Installation Steps

1. **Install Dependencies**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

2. **Database Setup**
   ```bash
   # Generate Prisma client
   npx prisma generate --schema ../prisma/schema.prisma

   # Run migrations
   npx prisma migrate deploy --schema ../prisma/schema.prisma

   # Seed database
   node ../prisma/run-seed.cjs
   ```

3. **Start Services**
   ```bash
   # Start Redis (required for background jobs)
   redis-server

   # Start Backend
   cd backend
   npm run dev

   # Start Frontend
   cd ../frontend
   npm run dev
   ```

4. **Background Job Processing**
   The job processors start automatically with the backend server. They handle:
   - OCR processing for uploaded PDFs
   - Sending scheduled reminders
   - Processing email/SMS/WhatsApp notifications

## API Documentation

### New Endpoints

#### Conflict of Interest
- `POST /api/coi/submit` - Submit COI declaration
- `GET /api/coi/assignment/:id` - Get COI for assignment
- `GET /api/coi/all` - Get all COI declarations (Admin/Secretariat)

#### Annotations
- `POST /api/annotations/create` - Create annotation
- `GET /api/annotations/assignment/:id` - Get annotations for assignment
- `PUT /api/annotations/:id` - Update annotation
- `DELETE /api/annotations/:id` - Delete annotation

#### Reminders
- `POST /api/reminders/create` - Create reminder
- `GET /api/reminders/all` - Get all reminders (Admin/Secretariat)
- `GET /api/reminders/user` - Get user's reminders
- `PUT /api/reminders/:id/status` - Update reminder status
- `PUT /api/reminders/:id/cancel` - Cancel reminder

#### OCR & Search
- `POST /api/ocr/process/:bookId` - Process OCR for book
- `GET /api/ocr/search` - Search in OCR content
- `GET /api/ocr/status/:bookId` - Get OCR status for book

#### Analytics
- `GET /api/analytics/reviewer-metrics` - Get reviewer performance
- `GET /api/analytics/system` - Get system analytics
- `GET /api/analytics/assignment-tracking` - Get assignment tracking

#### Criteria Management
- `GET /api/criteria` - Get all criteria
- `POST /api/criteria/create` - Create criterion
- `PUT /api/criteria/:id` - Update criterion
- `DELETE /api/criteria/:id` - Delete criterion
- `GET /api/criteria/:id` - Get criterion by ID

## Usage Guide

### For Reviewers

1. **COI Declaration**
   - Must declare conflicts of interest before reviewing
   - Access via review page when assignment is assigned
   - Can update declaration if circumstances change

2. **PDF Annotations**
   - Add annotations while reviewing PDFs
   - Upload marked-up files as attachments
   - Organize annotations by page and type

3. **Draft Reviews**
   - Save work as drafts before final submission
   - Edit drafts until deadline
   - Submit final review when ready

### For Secretariat

1. **Assignment Tracking**
   - Monitor all reviewer assignments
   - Track deadlines and progress
   - View COI declarations and conflicts

2. **Reminder Management**
   - Set up automated reminders
   - Configure reminder channels (email, SMS, WhatsApp)
   - Monitor reminder delivery status

3. **Content Search**
   - Search across all book content using OCR
   - Find specific terms or concepts
   - Navigate to relevant pages

### For Administrators

1. **Criteria Management**
   - Create and manage review criteria
   - Set weights and descriptions
   - Update criteria in real-time

2. **System Analytics**
   - Monitor reviewer performance
   - Track system usage statistics
   - Generate comprehensive reports

3. **Template Management**
   - Create custom report templates
   - Configure multilingual support
   - Manage template versions

## Testing

### Unit Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd ../frontend
npm test
```

### Integration Tests
- COI declaration workflow
- Annotation creation and management
- Reminder scheduling and delivery
- OCR processing pipeline
- Search functionality

## Deployment

### Docker Support
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: ncism_review
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/ncism_review
      REDIS_HOST: redis
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Production Considerations
- Configure Redis for high availability
- Set up proper SMTP service for email delivery
- Configure Twilio for SMS reliability
- Implement proper file storage (AWS S3, etc.)
- Set up monitoring for background jobs
- Configure proper logging and error tracking

## Troubleshooting

### Common Issues

1. **OCR Processing Fails**
   - Check Tesseract.js installation
   - Verify PDF file accessibility
   - Check Redis connection for job queue

2. **Reminders Not Sending**
   - Verify SMTP/SMS/WhatsApp credentials
   - Check Redis connection
   - Monitor background job logs

3. **Search Not Working**
   - Ensure OCR processing completed
   - Check database indexes
   - Verify search query format

4. **File Upload Issues**
   - Check upload directory permissions
   - Verify file size limits
   - Check multer configuration

### Logs and Monitoring
- Backend logs: Check console output and Winston logs
- Background jobs: Monitor BullMQ dashboard
- Database: Check PostgreSQL logs
- Redis: Monitor Redis logs and memory usage

## Security Considerations

- All new endpoints require JWT authentication
- Role-based access control for sensitive operations
- File upload validation and sanitization
- SQL injection prevention with Prisma
- XSS protection in frontend components
- Rate limiting for API endpoints
- Secure file storage and access

## Performance Optimization

- Lazy loading for PDF components
- Pagination for large datasets
- Redis caching for frequent queries
- Background job processing for heavy operations
- Database indexing for search queries
- CDN for static file delivery

## Future Enhancements

- Real-time notifications with WebSockets
- Advanced analytics with charts and graphs
- Mobile app support
- API rate limiting and throttling
- Advanced search with filters and facets
- Bulk operations for admin tasks
- Integration with external review systems
