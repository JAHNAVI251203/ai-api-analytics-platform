import { Router } from 'express';
import { LogController } from '../controllers/LogController';

const router = Router();

router.post('/logs', LogController.ingestLog);

export default router;