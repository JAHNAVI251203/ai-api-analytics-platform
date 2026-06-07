import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';

const router = Router();

router.get('', DashboardController.getDashboard);
router.get('/endpoint/:endpoint', DashboardController.getEndpointDetails);

export default router;