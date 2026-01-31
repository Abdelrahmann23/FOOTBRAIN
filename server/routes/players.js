import express from 'express';
import { authenticate } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { listPlayers, createPlayer } from '../controllers/playersController.js';

const router = express.Router();

// All player routes require authentication
router.use(authenticate);

// GET /api/players
router.get('/', asyncHandler(listPlayers));

// POST /api/players
router.post('/', asyncHandler(createPlayer));

export default router;

