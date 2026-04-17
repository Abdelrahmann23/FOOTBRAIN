import express from 'express';
import { authenticate, isAnalyst } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { listPlayers, createPlayer, bulkSetupPlayers, updatePlayer, deletePlayer } from '../controllers/playersController.js';

const router = express.Router();

// All player routes require authentication
router.use(authenticate);

// GET /api/players
router.get('/', asyncHandler(listPlayers));

// POST /api/players
router.post('/', isAnalyst, asyncHandler(createPlayer));

// POST /api/players/setup-bulk
router.post('/setup-bulk', isAnalyst, asyncHandler(bulkSetupPlayers));
router.put('/:id', isAnalyst, asyncHandler(updatePlayer));
router.delete('/:id', isAnalyst, asyncHandler(deletePlayer));

export default router;

