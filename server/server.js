import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import playerRoutes from './routes/players.js';
import adminRoutes from './routes/admin.js';
import { initializeAdmin } from './services/adminInit.service.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Mount not-found and error handler middlewares
app.use(notFound);
app.use(errorHandler);



// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();
    
    // Start server after MongoDB connection
    app.listen(PORT, async () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      await initializeAdmin();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
