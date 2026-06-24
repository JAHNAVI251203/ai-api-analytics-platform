# 🚀 API Sentinel - AI-Powered API Analytics & Monitoring Platform

A real-time API monitoring platform with AI-powered error analysis, anomaly detection, webhook alerting, background job processing, and live analytics visualization.

---

## 🌐 Live Demo

Frontend Dashboard:
https://ai-api-analytics-dashboard.vercel.app

Video Walkthrough:(./assets/dashboard-preview.png)(https://drive.google.com/file/d/1UJP_wGTTDyGFtG5PTBl61dRddjT6NuwP/view?usp=sharing)

Backend:
https://ai-api-analytics-platform-production.up.railway.app

Bull Board:
https://ai-api-analytics-platform-production.up.railway.app/admin/queues

## ✨ Features

### 📊 Analytics Dashboard
- Real-time API monitoring
- Request volume tracking
- Response time analysis
- Status code distribution
- Error monitoring

### 🤖 AI-Powered Analysis
- Gemini AI integration
- Automatic error analysis
- Root cause suggestions
- Performance recommendations

### ⚡ Real-Time Updates
- Socket.io live dashboard updates
- Instant metric refresh
- Live activity feed

### 🚨 Alerting System
- Custom alert rules
- Error rate monitoring
- Latency monitoring
- Webhook notifications
- Configurable thresholds

### 🔍 Data Exploration
- Endpoint search
- Status code filtering
- Time range filtering
- CSV export

### ⚙️ Background Processing
- BullMQ job queues
- Scheduled jobs
- Metrics aggregation
- Queue monitoring with Bull Board

### 🚀 Performance Optimization
- Redis caching
- BullMQ background jobs
- PostgreSQL indexing
- Automatic database migrations

### 🚨 Monitoring
- Error grouping
- Anomaly detection
- Historical trend analysis

### 🐳 Production Ready
- Dockerized backend
- Railway deployment
- Vercel deployment
- Environment-based configuration

---

# 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │ React Dashboard     │
                    │ (Vercel)            │
                    └──────────┬──────────┘
                               │
                               ▼

                 ┌──────────────────────────┐
                 │ Express Backend          │
                 │ Node.js + TypeScript     │
                 │ (Railway)                │
                 └───────┬─────────┬────────┘
                         │         │
                         ▼         ▼

                ┌────────────┐ ┌───────────┐
                │ PostgreSQL │ │   Redis   │
                │ Analytics  │ │ Cache/Jobs│
                └────────────┘ └─────┬─────┘
                                     │
                                     ▼

                            ┌────────────────┐
                            │ BullMQ Queues  │
                            └───────┬────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼

             ┌─────────────┐             ┌──────────────┐
             │ Bull Board  │             │ Gemini AI    │
             │ Queue UI    │             │ Analysis     │
             └─────────────┘             └──────────────┘
```
### Flow

1. Logs are ingested through API endpoints
2. PostgreSQL stores analytics data
3. BullMQ processes background jobs
4. Redis caches expensive operations
5. Gemini AI analyzes errors
6. Socket.io pushes live updates
7. React dashboard visualizes metrics
---

# 🛠 Tech Stack

## Backend

* Node.js
* TypeScript
* Express.js
* PostgreSQL
* Redis
* BullMQ
* Bull Board
* Socket.io
* Gemini AI & OpenRouter

## Frontend

* React
* TypeScript
* Axios
* Recharts
* Socket.io Client
* React Toastify

## Deployment

* Railway
* Vercel
* Dockerized backend

---

# 📦 Installation

## Prerequisites

* Node.js 18+
* PostgreSQL 15+
* Redis 7+
* Gemini API Key
* OpenRouter API Key

---

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd api-analytics
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Configure Environment

Create `.env`

```env
PORT=8000

DATABASE_URL=postgresql://username:password@localhost:5432/database_name

REDIS_URL=redis://localhost:6379

GEMINI_API_KEY=your_gemini_api_key_here

OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 4. Run Backend

```bash
npm run dev
```

### 5. Run Frontend

```bash
cd ../api-dashboard

npm install

npm start
```

---

# 📚 API Documentation

Detailed documentation available in:

```text
docs/API_DOCUMENTATION.md
```

---

## Health Check

```http
GET /health
```

Returns application health status.

---

## Dashboard Analytics

```http
GET /api/dashboard
```

Returns dashboard metrics and charts.

---

## Log Ingestion

```http
POST /api/logs
```

Stores API request metrics.

Example:

```json
{
  "endpoint": "/users",
  "method": "GET",
  "statusCode": 200,
  "responseTime": 120
}
```

---

## AI Error Analysis

```http
POST /api/ai/analyze-errors
```

Generates AI-powered recommendations using Gemini.

---

## Alert Rules

```http
POST /api/alerts/rules
```

Example:

```json
{
  "name": "High Error Rate",
  "condition_type": "error_rate",
  "threshold": 5,
  "time_window": "1 hour",
  "webhook_url": "https://webhook.site/your-url"
}
```

---

# 🚨 Alerting System

The platform supports configurable alert rules.

Supported Conditions:

* Error Rate
* Latency Threshold
* Request Volume

Features:

* Webhook notifications
* Alert history tracking
* Configurable thresholds
* Automatic evaluation through BullMQ jobs

---

# 🤖 AI Features

Gemini AI is used for:

* Error analysis
* Root cause identification
* Performance recommendations
* Operational insights

Responses are cached using Redis to reduce API cost and improve performance.

---

# ⚙️ Background Processing

BullMQ handles:

* Metrics aggregation
* Alert evaluation
* Anomaly detection
* Scheduled maintenance tasks

Bull Board provides:

* Queue monitoring
* Job inspection
* Failure tracking
* Retry management

---

# 📊 Dashboard Features

* Request volume charts
* Response time analytics
* Status code distribution
* Top error analysis
* Real-time activity feed
* Endpoint search
* Status code filters
* Time-range selection
* CSV export
* Toast notifications

---

# 🧪 Testing

### Rate Limiter Test

```bash
npm run test:rate
```

Tests API rate-limiting functionality.

---

### AI Integration Test

```bash
npm run test:ai
```

Tests Gemini AI integration and response generation.

---

### Integration Test

```bash
npm run test:integration
```

Tests end-to-end API functionality and service interactions.

---

### Load Testing

```bash
npm run load-test
```

Simulates API traffic to evaluate performance under load.

---

### Seed Sample Data

```bash
npm run seed
```

Populates PostgreSQL with sample API logs for dashboard testing.

---

# 🚀 Deployment

## Backend

Platform: Railway

```bash
docker build -t api-analytics .
```

Features:

* Dockerized deployment
* PostgreSQL integration
* Redis integration
* Automatic migrations

---

## Frontend

Platform: Vercel

```bash
npm run build
```

Automatic deployment through GitHub integration.

---

# 📈 Monitoring

Health Check:

```http
GET /health
```

Bull Board Dashboard:

```http
/admin/queues
```

Provides:

* Queue status
* Completed jobs
* Failed jobs
* Active jobs
* Job history

---

# 📖 Documentation

Additional documentation:

```text
docs/
├── ARCHITECTURE.md
├── DATABASE_SCHEMA.md
├── API_DOCUMENTATION.md
└── DEPLOYMENT.md
```

Postman Collection:

```text
postman_collection.json
```

---

# 🔮 Future Improvements

* Email notifications
* Slack integration
* Multi-project support
* User authentication
* Role-based access control
* Advanced machine learning anomaly detection

---

# 👩‍💻 Author

Jahnavi Satish

Built as a production-style full-stack monitoring platform to demonstrate backend engineering, real-time systems, AI integration, cloud deployment, and distributed job processing.
