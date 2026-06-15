import { Router } from "express";
import { AIController } from "../controllers/AIController";

const router = Router();

router.get("/analyze-errors", AIController.analyzeErrors);

router.get("/detect-anomalies", AIController.detectAnomalies);

router.post("/summarize-logs", AIController.summarizeLogs);

export default router;