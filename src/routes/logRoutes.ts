import { Router } from 'express';
import { LogController } from '../controllers/LogController';
import { authenticateIngestionKey } from '../middleware/ingestionAuth';

const router = Router();

router.post('/logs', authenticateIngestionKey, LogController.ingestLog);

export default router;
