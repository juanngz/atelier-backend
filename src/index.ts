import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { productRouter } from './routes/products';
import { salesRouter } from './routes/sales';
import { dashboardRouter } from './routes/dashboard';
import { loginRouter } from './routes/login';
import { registerRouter } from './routes/register';
import { authMiddleware } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
const allowedOrigins: (string | RegExp)[] = [
  'https://atelier-frontend-nine.vercel.app',   // producción (main)
  /^https:\/\/atelier-frontend.*\.vercel\.app$/, // previews de develop y otras branches
  'http://localhost:5173',
  'http://localhost:4173',
];

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (allowed) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

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

// Start server (only in local dev, not in Vercel serverless)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
export default app;
