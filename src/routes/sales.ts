import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const salesRouter = Router();

// GET /api/sales — list transactions (includes product info)
salesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        product: {
          select: { name: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/sales/stats — summary metrics
salesRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayTxns, allPaid] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          createdAt: { gte: today },
          status: 'PAID',
        },
      }),
      prisma.transaction.findMany({
        where: { status: 'PAID' },
      }),
    ]);

    const totalSalesToday = todayTxns.reduce((sum, t) => sum + t.amount * t.quantity, 0);
    const totalTransactions = allPaid.length;
    const avgOrderValue = totalTransactions > 0
      ? allPaid.reduce((sum, t) => sum + t.amount * t.quantity, 0) / totalTransactions
      : 0;

    res.json({
      totalSalesToday,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      totalTransactions,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// POST /api/sales — record a new sale (creates transaction + decrements stock)
salesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { productId, amount, quantity = 1, customer } = req.body;

    if (!productId || !amount) {
      res.status(400).json({ error: 'productId and amount are required' });
      return;
    }

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Check stock
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found');
      if (product.stock < quantity) throw new Error('Insufficient stock');

      // Decrement stock
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });

      // Create transaction
      return tx.transaction.create({
        data: {
          productId,
          amount,
          quantity,
          customer: customer || 'Anonymous',
          status: 'PAID',
        },
        include: {
          product: { select: { name: true, image: true } },
        },
      });
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'Product not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message === 'Insufficient stock') {
      res.status(409).json({ error: error.message });
      return;
    }
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Failed to create sale' });
  }
});

// PUT /api/sales/:id — update transaction status (e.g. refund)
salesRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const transaction = await prisma.transaction.update({
      where: { id: Number(req.params.id) },
      data: req.body,
      include: {
        product: { select: { name: true, image: true } },
      },
    });

    res.json(transaction);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});
