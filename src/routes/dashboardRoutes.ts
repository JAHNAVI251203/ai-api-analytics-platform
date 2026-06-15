import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';

const router = Router();

router.get('', DashboardController.getDashboard);
router.get('/endpoint/:endpoint', DashboardController.getEndpointDetails);
router.get('/search-endpoints', DashboardController.searchEndpoints);

export default router;