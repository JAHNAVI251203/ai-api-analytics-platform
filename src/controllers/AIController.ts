import { Request, Response } from "express";
import { AIService } from "../services/AIService";
import { CostTracker } from "../services/CostTracker";
import { redis } from "../config/database";
import { MetricsModel } from "../models/MetricsModel";

export class AIController {
  //POST /api/ai/analyze-errors ; cached for 5 mins
  static async analyzeErrors(req: Request, res: Response) {
    try {
      //check cache first(AI calls are expensive)
      const cacheKey = "ai:error-analysis";
      const cached = await redis.get(cacheKey);

      if (cached) {
        console.log("Cache hit: error analysis");
        return res.json({
          success: true,
          data: JSON.parse(cached),
          cached: true,
        });
      }

      //get top errors from last 24 hours
      const errors = await MetricsModel.getRecentErrors();
      //const errors = await (req.body.errors || []);

      if (errors.length === 0) {
        return res.json({
          success: true,
          data: { message: "No errors to analyze" },
        });
      }

      console.log("Analyzing errors with AI...");
      const analysis = await AIService.analyzeErrors(errors);

      //5 minutes = 300 seconds
      await redis.setex(cacheKey, 300, JSON.stringify(analysis));

      CostTracker.logAPICost(analysis.length || 200, "openai/gpt-oss-120b:free");//cost estimation based on token count

      res.json({
        success: true,
        data: analysis,
        analyzedErrorCount: errors.length,
        cached: false,
      });
    } catch (error) {
      console.error("Error in analyzeErrors:", error);

      return res.json({
        success: true,
        data: {
          rootCause: "AI Service Unavailable",
          severity: "medium",
          suggestedFix:
            "Gemini/OpenRouter quota exhausted. Dashboard analytics continue to function normally.",
          affectedEndpoints: [],
        },
        fallback: true,
      });
    }
  }

  //POST /api/ai/detect-anomalies ; cached for 2 mins
  static async detectAnomalies(req: Request, res: Response) {
    let metricsWithContext: any = { error_count: 0 };

    try {
      const cacheKey = "ai:anomaly-detection";
      const cached = await redis.get(cacheKey);

      if (cached) {
        console.log("Cache hit: anomaly detection");
        return res.json({
          success: true,
          data: JSON.parse(cached),
          cached: true,
        });
      }

      metricsWithContext = await MetricsModel.getAnomalyMetrics("1 hour");

      console.log("Detecting anomalies with AI...");
      const anomalies = await AIService.detectAnomalies(metricsWithContext);

      await redis.setex(cacheKey, 120, JSON.stringify(anomalies));

      CostTracker.logAPICost(300, "gpt-3.5-turbo");

      res.json({
        success: true,
        data: anomalies,
        cached: false,
      });
    } catch (error) {
      console.error("Error in detectAnomalies:", error);
      return res.json({
        success: true,
        data: {
          hasAnomaly: metricsWithContext.error_count > 10,
          anomalyType: metricsWithContext.error_count > 10 ? "error_spike" : "none",
          severity: metricsWithContext.error_count > 10 ? "medium" : "low",
          explanation: `Detected ${metricsWithContext.error_count} errors in the last hour.`,
          recommendation: "Review recent API failures.",
        },
        fallback: true,
      });
    }
  }

  // POST /api/ai/summarize-logs ; cached for 2 mins
  static async summarizeLogs(req: Request, res: Response) {
    try {
      const cacheKey = "ai:log-summary";
      const cached = await redis.get(cacheKey);

      if (cached) {
        console.log("Cache hit: log summary");
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

      console.log("Summarizing logs with AI...");
      const summary = await AIService.summarizeLogs(logs);

      const safeSummary =
        typeof summary === "string" && summary.trim().length > 0
          ? summary
          : "AI summary unavailable for this time range.";

      await redis.setex(cacheKey, 120, safeSummary);

      CostTracker.logAPICost(150, "openai/gpt-oss-120b:free");

      res.json({
        success: true,
        data: { summary: safeSummary },
        logCount: logs.length,
        cached: false,
      });
    } catch (error) {
      console.error("Error in summarizeLogs:", error);

      return res.json({
        success: true,
        data: {
          summary:
            "AI log summarization unavailable. Displaying raw logs instead."
        },
        fallback: true,
      });
    }
  }

}