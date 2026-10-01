import { Router } from 'express';
import { MetricsController } from '../controllers/MetricsController';

const router = Router();

router.get('/metrics', MetricsController.getMetrics);
router.get('/errors', MetricsController.getErrors);

export default router;
