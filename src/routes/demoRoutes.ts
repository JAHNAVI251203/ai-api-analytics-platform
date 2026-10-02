import { Router } from 'express';
import { DemoController } from '../controllers/DemoController';

const router = Router();
router.post('', DemoController.run);
export default router;
