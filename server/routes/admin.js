import express from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { listUsers, stats, createUser, updateUser, deleteUser } from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require authenticated admin
router.use(authenticate, isAdmin);

router.get('/users', asyncHandler(listUsers));
router.get('/stats', asyncHandler(stats));
router.post('/users', asyncHandler(createUser));
router.put('/users/:email', asyncHandler(updateUser));
router.delete('/users/:email', asyncHandler(deleteUser));

export default router;

