import express from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { predictMarketValue, predictInjury, health } from '../controllers/aiController.js';

const router = express.Router();

router.post('/predict/market-value', asyncHandler(predictMarketValue));
router.post('/predict/injury', asyncHandler(predictInjury));
router.get('/health', asyncHandler(health));

export default router;
