import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dashboardRouter = Router();

// GET /api/dashboard — all dashboard data in one call
dashboardRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all data in parallel
    const [products, todayTransactions, allTransactions, last7DaysTransactions] = await Promise.all([
      prisma.product.findMany({ orderBy: { stock: 'asc' } }),
      prisma.transaction.findMany({
        where: { createdAt: { gte: today }, status: 'PAID' },
      }),
      prisma.transaction.findMany({
        where: { status: 'PAID' },
      }),
      prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          status: 'PAID',
        },
        include: {
          product: { select: { name: true, image: true } },
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
      productName: t.product.name,
      productImage: t.product.image,
      customer: t.customer,
      amount: t.amount * t.quantity,
      status: t.status,
      date: t.createdAt,
    }));

    res.json({
      dailyRevenue,
      todayTxCount,
      totalProducts,
      chartData,
      recentTransactions,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});
