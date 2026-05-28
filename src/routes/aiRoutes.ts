import { Router } from "express";
import { AIController } from "../controllers/AIController";

/**
 * AI Routes - Day 9
 * Endpoints for AI-powered API monitoring and analysis
 */
const router = Router();

/**
 * POST /api/ai/analyze-errors
 * Analyzes error logs and provides root cause analysis
 *
 * Request body:
 * {
 *   "errors": [
 *     {
 *       "timestamp": "2024-05-26T10:30:00Z",
 *       "endpoint": "/api/users",
 *       "status": 500,
 *       "message": "Database connection timeout",
 *       "stack": "ConnectionError: ECONNREFUSED"
 *     }
 *   ]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "rootCause": "database",
 *     "severity": "high",
 *     "suggestedFix": "Check database connection pool and restart service",
 *     "affectedEndpoints": ["/api/users"]
 *   },
 *   "analyzedErrorCount": 1,
 *   "cached": false
 * }
 */
router.post("/analyze-errors", AIController.analyzeErrors);

/**
 * POST /api/ai/detect-anomalies
 * Detects performance anomalies in API metrics
 *
 * Request body:
 * {
 *   "metrics": {
 *     "total_requests": 12500,
 *     "error_count": 450,
 *     "avg_response_time": 280,
 *     "slowest_endpoint": "/api/reports/generate"
 *   }
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "hasAnomaly": true,
 *     "anomalyType": "latency_increase",
 *     "severity": "medium",
 *     "explanation": "Response time is 87% higher than baseline",
 *     "recommendation": "Check /api/reports/generate endpoint"
 *   },
 *   "cached": false
 * }
 */
router.post("/detect-anomalies", AIController.detectAnomalies);

/**
 * POST /api/ai/summarize-logs
 * Generates AI-powered summary of API logs
 *
 * Request body:
 * {
 *   "logs": [
 *     { "timestamp": "2024-05-26T10:00:00Z", "endpoint": "/api/users", "status": 200, "duration": 145 },
 *     { "timestamp": "2024-05-26T10:01:00Z", "endpoint": "/api/users", "status": 200, "duration": 152 }
 *   ]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "summary": "Most requests were to /api/users endpoint with average response time of 148ms. No performance issues detected."
 *   },
 *   "logCount": 2,
 *   "cached": false
 * }
 */
router.post("/summarize-logs", AIController.summarizeLogs);

export default router;