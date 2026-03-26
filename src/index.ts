import express from 'express';
import cors from 'cors';
import { productRouter } from './routes/products';
import { salesRouter } from './routes/sales';
import { dashboardRouter } from './routes/dashboard';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productRouter);
app.use('/api/sales', salesRouter);
app.use('/api/dashboard', dashboardRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
