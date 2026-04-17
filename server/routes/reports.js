import express from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { playerReport, playerTrends, queueReportEmail } from '../controllers/analyticsController.js';

const router = express.Router();

router.use(authenticate);
router.get('/players/:globalId', asyncHandler(playerReport));
router.get('/players/:globalId/trends', asyncHandler(playerTrends));
router.post('/email', asyncHandler(queueReportEmail));

export default router;
