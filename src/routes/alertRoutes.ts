import { Router } from "express";
import { AlertController } from "../controllers/AlertController";

const router = Router();

router.post("/rules", AlertController.createRule);

router.get("/rules", AlertController.getRules);

router.post("/test", AlertController.testAlert);

export default router;