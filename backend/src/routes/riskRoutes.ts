import { Router } from 'express';
import {
  getOrderRisk,
  getPipelineRisks,
  getGlobalRecommendations,
} from '../controllers/riskController.js';

const router = Router();

router.get('/order/:orderId', getOrderRisk);
router.get('/pipeline', getPipelineRisks);
router.get('/recommendations', getGlobalRecommendations);

export default router;
