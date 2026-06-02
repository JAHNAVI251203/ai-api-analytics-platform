import { Router } from "express";
import { AIController } from "../controllers/AIController";

const router = Router();

router.post("/analyze-errors", AIController.analyzeErrors);

router.post("/detect-anomalies", AIController.detectAnomalies);

router.post("/summarize-logs", AIController.summarizeLogs);

export default router;