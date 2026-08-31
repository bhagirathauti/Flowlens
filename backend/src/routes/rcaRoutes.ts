import { Router } from 'express';
import { traceComplaintRCA, getRCAAnalytics } from '../controllers/rcaController.js';

const router = Router();

router.get('/trace/:complaintId', traceComplaintRCA);
router.get('/analytics', getRCAAnalytics);

export default router;
