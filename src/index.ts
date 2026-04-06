import express from 'express';
import cors from 'cors';
import { productRouter } from './routes/products';
import { salesRouter } from './routes/sales';
import { dashboardRouter } from './routes/dashboard';
import { loginRouter } from './routes/login';
import { registerRouter } from './routes/register';
import { authMiddleware } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Public routes (no auth required)
app.use('/api/login', loginRouter);
app.use('/api/register', registerRouter);

// Protected routes (auth required)
app.use('/api/products', authMiddleware, productRouter);
app.use('/api/sales', authMiddleware, salesRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
