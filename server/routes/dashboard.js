import express from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { authenticate, isAdmin, isAnalyst } from '../middleware/auth.js';
import { analystDashboard, adminDashboard } from '../controllers/analyticsController.js';

const router = express.Router();

router.use(authenticate);
router.get('/analyst', isAnalyst, asyncHandler(analystDashboard));
router.get('/admin', isAdmin, asyncHandler(adminDashboard));

export default router;
