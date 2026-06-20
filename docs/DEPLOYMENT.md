# Deployment Guide

## Overview

The AI-Powered API Analytics & Monitoring Platform is deployed using:

| Service | Platform |
|----------|----------|
| Frontend | Vercel |
| Backend | Railway |
| PostgreSQL | Railway |
| Redis | Railway |
| AI Provider | Gemini AI & OpenRouter |

---

# Production Architecture

```text
Users
  │
  ▼

Frontend (Vercel)
  │
  ▼

Backend API (Railway)
  │
  ├── PostgreSQL
  │
  ├── Redis
  │
  ├── BullMQ Workers
  │
  └── Gemini AI & OpenRouter
```

---

# Backend Deployment

## Platform

Railway

### Features

- Automatic deployments from GitHub
- Docker support
- Environment variable management
- Managed PostgreSQL
- Managed Redis

---

## Docker Configuration

Backend is deployed using Docker.

### Build Command

```bash
docker build -t api-analytics .
```

### Run Command

```bash
docker run -p 8000:8000 api-analytics
```

---

## Railway Deployment Steps

### 1. Connect Repository

- Create Railway project
- Connect GitHub repository
- Select backend repository

---

### 2. Configure Environment Variables

Add:

```env
PORT=8000

DATABASE_URL=postgresql://username:password@localhost:5432/database_name

REDIS_URL=redis://localhost:6379

GEMINI_API_KEY=your_gemini_api_key_here

OPENROUTER_API_KEY=your_openrouter_api_key_here
```

---

### 3. Deploy

Railway automatically:

- Builds Docker image
- Starts application
- Exposes public URL

Example:

```text
https://ai-api-analytics-platform-production.up.railway.app
```

---

# Database Deployment

## PostgreSQL

Platform:

```text
Railway PostgreSQL
```

Used for:

- API logs
- Error tracking
- Alert rules
- Alert history
- Dashboard analytics

---

## Automatic Migrations

Database tables are created automatically during application startup.

Migration entry point:

```text
src/migrations/init.ts
```

Tables:

- api_logs
- error_groups
- alert_rules
- alert_history

---

# Redis Deployment

## Platform

Railway Redis

Used for:

- BullMQ queue storage
- AI response caching
- Dashboard caching
- Background job processing

---

# Frontend Deployment

## Platform

Vercel

### Build Command

```bash
npm run build
```

---

## Environment Variables

```env
REACT_APP_API_URL=https://ai-api-analytics-platform-production.up.railway.app
```

---

## Deployment Flow

1. Connect GitHub repository
2. Import project into Vercel
3. Configure environment variables
4. Deploy

Vercel automatically:

- Builds React application
- Deploys static assets
- Provides HTTPS URL

Example:

```text
https://ai-api-analytics-dashboard.vercel.app
```

---

# Real-Time Communication

Socket.io is used for live dashboard updates.

### Backend

```text
Railway
```

### Frontend

```text
Vercel
```

The frontend establishes a WebSocket connection to the Railway backend for:

- Live activity feed
- Dashboard updates
- Alert notifications

---

# Background Job Deployment

## BullMQ

Background jobs run within the backend service.

Jobs include:

- Metrics aggregation
- Alert evaluation
- Anomaly detection

---

## Bull Board

Queue monitoring dashboard:

```text
/admin/queues
```

Features:

- Active jobs
- Waiting jobs
- Completed jobs
- Failed jobs
- Queue statistics

---

# Health Monitoring

## Health Endpoint

```http
GET /health
```

Used to verify:

- API availability
- Deployment status
- Service uptime

---

# Deployment Checklist

## Backend

- [ ] Railway project created
- [ ] GitHub repository connected
- [ ] Dockerfile configured
- [ ] Environment variables added
- [ ] PostgreSQL connected
- [ ] Redis connected
- [ ] Deployment successful

---

## Frontend

- [ ] Vercel project created
- [ ] GitHub repository connected
- [ ] API URL configured
- [ ] Deployment successful

---

## Verification

Confirm:

- [ ] Frontend loads successfully
- [ ] Backend health endpoint responds
- [ ] Dashboard data loads
- [ ] PostgreSQL connected
- [ ] Redis connected
- [ ] AI analysis works
- [ ] Bull Board accessible
- [ ] WebSocket updates working
- [ ] Alert webhooks functioning

---

# CI/CD Workflow

```text
Git Push
    │
    ▼

GitHub Repository
    │
    ├── Railway Deploys Backend
    │
    └── Vercel Deploys Frontend

    ▼

Production Environment
```

Every push to the main branch automatically triggers deployment.

---

# Related Documentation

```text
README.md
API_DOCUMENTATION.md
DATABASE_SCHEMA.md
```