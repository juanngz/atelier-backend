import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
export const dashboardRouter = Router();

// GET /api/dashboard — all dashboard data in one call
dashboardRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all data in parallel
    const [products, todayTransactions, allTransactions, last7DaysTransactions] = await Promise.all([
      prisma.product.findMany({
        where: { userId: userId },
        orderBy: { stock: 'asc' },
      }),
      prisma.transaction.findMany({
        where: {
          createdAt: { gte: today },
          status: 'PAID',
          product: { userId: userId },
        },
      }),
      prisma.transaction.findMany({
        where: {
          status: 'PAID',
          product: { userId: userId },
        },
      }),
      prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          status: 'PAID',
          product: { userId: userId },
        },
        include: {
          product: { select: { name: true, image: true, category: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Daily revenue
    const dailyRevenue = todayTransactions.reduce(
      (sum: number, t: any) => sum + t.amount * t.quantity, 0
    );

    // Total transactions today
    const todayTxCount = todayTransactions.length;

    // Total products
    const totalProducts = products.length;

    // Weekly chart data (last 7 days)
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayRevenue = allTransactions
        .filter((t: any) => {
          const created = new Date(t.createdAt);
          return created >= date && created < nextDate;
        })
        .reduce((sum: number, t: any) => sum + t.amount * t.quantity, 0);

      chartData.push({ day: days[date.getDay()], revenue: dayRevenue });
    }

    // Recent transactions (last 5)
    const recentTransactions = last7DaysTransactions.slice(0, 5).map((t: any) => ({
      id: t.id,
      productName: t.product.category ? `${t.product.category} de ${t.product.name}` : t.product.name,
      productImage: t.product.image,
      amount: t.amount * t.quantity,
      status: t.status,
      date: t.createdAt,
    }));

    // Low stock alert (stock <= 5)
    const LOW_STOCK_THRESHOLD = 5;
    const lowStockProducts = products
      .filter((p: any) => p.stock <= LOW_STOCK_THRESHOLD)
      .map((p: any) => ({ id: p.id, name: p.name, stock: p.stock, unidad: p.unidad, category: p.category }));

    res.json({
      dailyRevenue,
      todayTxCount,
      totalProducts,
      chartData,
      recentTransactions,
      lowStockProducts,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});
