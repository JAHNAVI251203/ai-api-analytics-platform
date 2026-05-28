import { Request, Response } from "express";
import { AIService } from "../services/AIService";
import { CostTracker } from "../services/CostTracker";
import { redis } from "../config/database";

/**
 * AIController - Handles AI-powered analysis endpoints with caching
 * Day 9: Add controllers, caching, and error handling
 */
export class AIController {
  /**
   * POST /api/ai/analyze-errors
   * Analyzes error logs and provides root cause analysis
   * Results cached for 5 minutes
   */
  static async analyzeErrors(req: Request, res: Response) {
    try {
      // Check cache first (AI calls are expensive)
      const cacheKey = "ai:error-analysis";
      const cached = await redis.get(cacheKey);

      if (cached) {
        console.log("✓ Cache hit: error analysis");
        return res.json({
          success: true,
          data: JSON.parse(cached),
          cached: true,
        });
      }

      // Get top errors from last 24 hours
      const errors = await (req.body.errors || []);

      if (errors.length === 0) {
        return res.json({
          success: true,
          data: { message: "No errors to analyze" },
        });
      }

      // AI analysis
      console.log("🤖 Analyzing errors with AI...");
      const analysis = await AIService.analyzeErrors(errors);

      // Cache for 5 minutes (300 seconds)
      await redis.setex(cacheKey, 300, JSON.stringify(analysis));

      // Log cost
      CostTracker.logAPICost(analysis.length || 200, "gpt-3.5-turbo");

      res.json({
        success: true,
        data: analysis,
        analyzedErrorCount: errors.length,
        cached: false,
      });
    } catch (error) {
      console.error("Error in analyzeErrors:", error);
      res.status(500).json({
        success: false,
        error: "AI analysis failed",
      });
    }
  }

  /**
   * POST /api/ai/detect-anomalies
   * Detects performance anomalies in API metrics
   * Results cached for 2 minutes
   */
  static async detectAnomalies(req: Request, res: Response) {
    try {
      // Check cache
      const cacheKey = "ai:anomaly-detection";
      const cached = await redis.get(cacheKey);

      if (cached) {
        console.log("✓ Cache hit: anomaly detection");
        return res.json({
          success: true,
          data: JSON.parse(cached),
          cached: true,
        });
      }

      // Get current metrics (from request body or database)
      const metricsWithContext = {
        ...req.body.metrics,
        slowest_endpoint: req.body.slowest_endpoint || "/api/reports/generate",
      };

      // AI anomaly detection
      console.log("🔍 Detecting anomalies with AI...");
      const anomalies = await AIService.detectAnomalies(metricsWithContext);

      // Cache for 2 minutes (120 seconds)
      await redis.setex(cacheKey, 120, JSON.stringify(anomalies));

      // Log cost
      CostTracker.logAPICost(300, "gpt-3.5-turbo");

      res.json({
        success: true,
        data: anomalies,
        cached: false,
      });
    } catch (error) {
      console.error("Error in detectAnomalies:", error);
      res.status(500).json({
        success: false,
        error: "Anomaly detection failed",
      });
    }
  }

  /**
   * POST /api/ai/summarize-logs
   * Generates AI-powered summary of API logs
   * Results cached for 2 minutes
   */
  static async summarizeLogs(req: Request, res: Response) {
    try {
      // Check cache
      const cacheKey = "ai:log-summary";
      const cached = await redis.get(cacheKey);

      if (cached) {
        console.log("✓ Cache hit: log summary");
        return res.json({
          success: true,
          data: { summary: cached },
          cached: true,
        });
      }

      const logs = req.body.logs || [];

      if (logs.length === 0) {
        return res.json({
          success: true,
          data: { summary: "No logs to summarize" },
        });
      }

      // AI log summarization
      console.log("📝 Summarizing logs with AI...");
      const summary = await AIService.summarizeLogs(logs);

      // Cache for 2 minutes (120 seconds)
      await redis.setex(cacheKey, 120, summary);

      // Log cost
      CostTracker.logAPICost(150, "gpt-3.5-turbo");

      res.json({
        success: true,
        data: { summary },
        logCount: logs.length,
        cached: false,
      });
    } catch (error) {
      console.error("Error in summarizeLogs:", error);
      res.status(500).json({
        success: false,
        error: "Log summarization failed",
      });
    }
  }
}