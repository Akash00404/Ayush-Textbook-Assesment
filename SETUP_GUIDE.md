# NCISM Textbook Review System - Phase 2 Setup Guide

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js 18+** (recommended LTS version)
- **PostgreSQL 13+** (running and accessible)
- **Redis** (for background job processing)
- **Git** (for version control)

## Step 1: Install Dependencies

### Backend Dependencies
```bash
cd backend
npm install
```

### Frontend Dependencies
```bash
cd frontend
npm install
```

## Step 2: Environment Configuration

### Backend Environment (.env)
Create `backend/.env` file with the following content:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ncism_review"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="1d"

# Server Configuration
PORT=5000
NODE_ENV=development

# Redis Configuration (for background jobs)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@ncism.edu

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp Configuration
WHATSAPP_ENABLED=true

# File Upload Configuration
UPLOAD_DIR=./uploads/books
ANNOTATION_UPLOAD_DIR=./uploads/annotations
MAX_FILE_SIZE=10485760
```

### Frontend Environment (.env)
Create `frontend/.env` file:

```env
VITE_API_URL=http://localhost:5000
```

## Step 3: Database Setup

### 1. Generate Prisma Client
```bash
# From project root
npx prisma generate --schema prisma/schema.prisma
```

### 2. Run Database Migrations
```bash
# From project root
npx prisma migrate deploy --schema prisma/schema.prisma
```

### 3. Seed the Database
```bash
# From project root
node prisma/run-seed.cjs
```

## Step 4: Start Required Services

### 1. Start Redis (Required for background jobs)
```bash
# On Windows (if Redis is installed)
redis-server

# On macOS (if Redis is installed via Homebrew)
brew services start redis

# On Linux
sudo systemctl start redis
```

### 2. Verify PostgreSQL is Running
```bash
# Check if PostgreSQL is running
psql -U your_username -d ncism_review -c "SELECT version();"
```

## Step 5: Start the Application

### Terminal 1: Backend Server
```bash
cd backend
npm run dev
```

### Terminal 2: Frontend Development Server
```bash
cd frontend
npm run dev
```

## Step 6: Verify Installation

### 1. Check Backend Health
Open your browser and go to: `http://localhost:5000/api/books`
You should see a JSON response (may be empty array initially).

### 2. Check Frontend
Open your browser and go to: `http://localhost:3000`
You should see the login page.

### 3. Test Login
Use these seeded credentials:
- **Admin**: admin@ncism.edu / Admin@123
- **Secretariat**: secretariat@ncism.edu / Secret@123
- **Reviewer**: reviewer1@ncism.edu / Review@123
- **Committee**: committee@ncism.edu / Committee@123

## Step 7: Test Phase 2 Features

### 1. COI Declaration
1. Login as a reviewer
2. Go to a review assignment
3. You should see a COI declaration prompt
4. Fill out and submit the declaration

### 2. Secretariat Dashboard
1. Login as secretariat@ncism.edu
2. Navigate to "Secretariat" in the sidebar
3. Check assignment tracking and analytics

### 3. Admin Panel
1. Login as admin@ncism.edu
2. Navigate to "Admin Panel" in the sidebar
3. Test criteria management

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Error
```
Error: Can't reach database server
```
**Solution**: 
- Check if PostgreSQL is running
- Verify DATABASE_URL in backend/.env
- Ensure database exists: `createdb ncism_review`

#### 2. Redis Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution**:
- Install Redis: `brew install redis` (macOS) or `sudo apt-get install redis` (Linux)
- Start Redis: `redis-server`

#### 3. Prisma Client Error
```
Error: @prisma/client did not initialize yet
```
**Solution**:
```bash
npx prisma generate --schema prisma/schema.prisma
```

#### 4. Migration Error
```
Error: Environment variable not found: DATABASE_URL
```
**Solution**:
- Ensure backend/.env exists and has DATABASE_URL
- Copy from backend/.env.example if needed

#### 5. Frontend Build Error
```
Error: Cannot resolve module
```
**Solution**:
```bash
cd frontend
npm install
npm run build
```

#### 6. Port Already in Use
```
Error: listen EADDRINUSE :::5000
```
**Solution**:
- Change PORT in backend/.env to another port (e.g., 5001)
- Or kill the process using the port: `lsof -ti:5000 | xargs kill`

### Database Reset (if needed)
```bash
# Drop and recreate database
npx prisma migrate reset --schema prisma/schema.prisma

# Or manually:
# 1. Drop database: dropdb ncism_review
# 2. Create database: createdb ncism_review
# 3. Run migrations: npx prisma migrate deploy --schema prisma/schema.prisma
# 4. Seed database: node prisma/run-seed.cjs
```

## Development Commands

### Backend Commands
```bash
cd backend

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Prisma commands
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### Frontend Commands
```bash
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Lint code
npm run lint
```

## Production Deployment

### 1. Build Applications
```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build
```

### 2. Environment Variables
Set production environment variables:
- Database URL (production PostgreSQL)
- Redis URL (production Redis)
- SMTP credentials (production email service)
- JWT secret (strong, unique secret)

### 3. Start Production Services
```bash
# Start Redis
redis-server

# Start backend
cd backend
npm start

# Serve frontend (using nginx, Apache, or similar)
# Point to frontend/dist directory
```

## Monitoring and Logs

### Backend Logs
- Check console output for server logs
- Winston logging is configured for file logging
- Monitor background job processing

### Database Monitoring
```bash
# Connect to database
psql -U your_username -d ncism_review

# Check tables
\dt

# Check data
SELECT * FROM users;
SELECT * FROM books;
SELECT * FROM assignments;
```

### Redis Monitoring
```bash
# Connect to Redis
redis-cli

# Check keys
keys *

# Monitor commands
monitor
```

## Support

If you encounter issues not covered in this guide:

1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure all services (PostgreSQL, Redis) are running
4. Check network connectivity between services
5. Review the README_PHASE2.md for detailed feature documentation

## Next Steps

Once the application is running successfully:

1. **Configure External Services**: Set up proper SMTP, SMS, and WhatsApp services
2. **Customize Templates**: Modify report templates for your specific needs
3. **Add Users**: Create additional users through the admin panel
4. **Upload Books**: Test the book upload functionality
5. **Create Assignments**: Assign books to reviewers
6. **Test Workflows**: Complete the full review workflow

The application is now ready for use with all Phase 2 features enabled!
