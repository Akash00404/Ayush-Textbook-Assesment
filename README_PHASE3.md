# NCISM Textbook Review System - Phase 3

## Overview

Phase 3 extends the NCISM textbook review application with AI-powered features using Google Gemini, microservices architecture, Kubernetes deployment, and a public portal for approved textbooks.

## Features

### 🔹 AI Features with Gemini

- **AI Summarization**: Generate executive summaries of reviewer feedback with strengths, weaknesses, and recommendations
- **Conflict Detection**: Automatically detect disagreements between reviewers using AI analysis
- **Action Suggestions**: Get AI-powered recommendations for committee decisions
- **Language Support**: Multilingual support for English + Ayurveda/Unani/Siddha terminology

### 🔹 Scalability & Deployment

- **Microservices Architecture**: Separate services for Auth, Review Management, AI, and Notifications
- **Kubernetes Deployment**: Full K8s manifests with Helm charts
- **Horizontal Scaling**: HPA (Horizontal Pod Autoscaler) for automatic scaling
- **CI/CD Pipelines**: GitHub Actions + ArgoCD integration

### 🔹 Public Portal

- Public-facing website for approved textbooks
- Search and filter functionality
- AI-generated summaries visible to public
- Access control: only approved books are visible

### 🔹 Reviewer Reputation System

- Track reviewer reliability (consistency, timeliness, quality)
- Reviewer scores visible to committee/admin
- Feed into reviewer assignment algorithm

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│  PostgreSQL │
│  (React)    │     │  (Express)  │     │  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
                            │
                            ▼
                    ┌─────────────┐
                    │   Gemini AI │
                    │   Service   │
                    └─────────────┘
```

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Docker & Kubernetes cluster
- Google Gemini API key

### Environment Variables

#### Backend (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ncism
JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-gemini-api-key
PORT=5000
REDIS_URL=redis://localhost:6379
NODE_ENV=production
```

#### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Database Migration

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### Running Locally

#### Backend

```bash
cd backend
npm install
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured
- Helm 3.x

### Deploy with Helm

```bash
# Install Helm chart
helm install ncism ./helm/ncism \
  --namespace ncism \
  --create-namespace \
  --set image.backend.tag=latest \
  --set image.frontend.tag=latest

# Create secrets
kubectl create secret generic ncism-secrets \
  --from-literal=database-url=postgresql://... \
  --from-literal=jwt-secret=... \
  --from-literal=gemini-api-key=... \
  --namespace ncism
```

### Deploy with kubectl

```bash
# Apply base manifests
kubectl apply -f k8s/base/

# Apply monitoring
kubectl apply -f k8s/monitoring/
```

## CI/CD Pipeline

The CI/CD pipeline is configured in `.github/workflows/ci-cd.yml`:

1. **Test**: Run unit tests for backend and frontend
2. **Build**: Build Docker images and push to registry
3. **Deploy**: Deploy to Kubernetes using Helm

### GitHub Actions Secrets

- `KUBECONFIG`: Kubernetes cluster configuration

## Monitoring & Logging

### Prometheus

Metrics are exposed at `/metrics` endpoint. Prometheus scrapes metrics from all pods.

### Grafana

Access Grafana dashboard for visualization:
- Backend performance metrics
- Request rates and latencies
- Error rates
- Resource utilization

### ELK Stack

Centralized logging with:
- **Elasticsearch**: Log storage
- **Logstash**: Log processing
- **Kibana**: Log visualization

## API Endpoints

### AI Endpoints

- `POST /api/ai/books/:bookId/summary` - Generate AI summary
- `GET /api/ai/books/:bookId/summary` - Get AI summary
- `POST /api/ai/books/:bookId/conflicts` - Detect conflicts
- `GET /api/ai/books/:bookId/conflicts` - Get conflicts
- `POST /api/ai/books/:bookId/actions` - Generate action suggestions

### Reviewer Scores

- `GET /api/reviewer-scores/reviewers/:reviewerId` - Get reviewer score
- `POST /api/reviewer-scores/reviewers/:reviewerId/calculate` - Calculate score
- `GET /api/reviewer-scores/reviewers` - Get all scores (admin/secretariat)

### Public Portal

- `GET /api/books/public/approved` - Get approved books (no auth)

## Database Schema

### New Tables (Phase 3)

- `ai_summaries`: Store AI-generated summaries
- `conflict_flags`: Track detected conflicts
- `reviewer_scores`: Reviewer reputation scores

See `backend/prisma/schema.prisma` for full schema.

## Frontend Components

### AI Components

- `AISummaryPreview`: Display AI-generated summary
- `ConflictVisualization`: Visualize conflicts with charts
- `ActionSuggestions`: Show AI-recommended actions

### Public Portal

- `PublicPortalPage`: Public-facing page for approved books

## Scaling

### Horizontal Pod Autoscaler (HPA)

HPA automatically scales pods based on:
- CPU utilization (target: 70%)
- Memory utilization (target: 80%)

### Manual Scaling

```bash
kubectl scale deployment backend --replicas=5 -n ncism
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n ncism
```

### View Logs

```bash
kubectl logs -f deployment/backend -n ncism
```

### Check Services

```bash
kubectl get svc -n ncism
```

## Security

- All secrets stored in Kubernetes secrets
- JWT authentication for API endpoints
- Public portal endpoints are read-only
- RBAC configured for service accounts

## Documentation

- [Setup Guide](./SETUP_GUIDE.md)
- [Phase 2 Documentation](./README_PHASE2.md)
- [API Documentation](./docs/API.md)

## License

[Your License Here]

