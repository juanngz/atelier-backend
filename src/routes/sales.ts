import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
export const salesRouter = Router();

// GET /api/sales — list transactions (includes product info)
salesRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const transactions = await prisma.transaction.findMany({
      where: { product: { userId: userId } },
      include: {
        product: {
          select: { name: true, image: true, category: true },
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
salesRouter.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereClause = { product: { userId: userId }, status: 'PAID' };
    const todayWhereClause = {
      createdAt: { gte: today },
      status: 'PAID',
      product: { userId: userId },
    };

    const [todayTxns, allPaid] = await Promise.all([
      prisma.transaction.findMany({
        where: todayWhereClause,
      }),
      prisma.transaction.findMany({
        where: whereClause,
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
salesRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { productId, amount, quantity = 1, customer } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!productId || !amount) {
      res.status(400).json({ error: 'productId and amount are required' });
      return;
    }

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Check stock and ownership
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found');
      if (product.userId !== userId) throw new Error('Unauthorized: Product does not belong to this user');
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
          product: { select: { name: true, image: true, category: true } },
        },
      });
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'Product not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message === 'Unauthorized: Product does not belong to this user') {
      res.status(403).json({ error: error.message });
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
salesRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const updateData = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get transaction and verify ownership
    const transaction = await prisma.transaction.findUnique({
      where: { id: Number(req.params.id) },
      include: { product: true },
    });

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    if (transaction.product.userId !== userId) {
      res.status(403).json({ error: 'Unauthorized: Transaction does not belong to this user' });
      return;
    }

    const updated = await prisma.transaction.update({
      where: { id: Number(req.params.id) },
      data: updateData,
      include: {
        product: { select: { name: true, image: true, category: true } },
      },
    });

    res.json(updated);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});
