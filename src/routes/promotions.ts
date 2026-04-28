import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
export const promotionsRouter = Router();

const promotionInclude = {
  items: {
    include: {
      product: {
        select: { id: true, name: true, category: true, price: true, unidad: true },
      },
    },
  },
};

// GET /api/promotions
promotionsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const promotions = await prisma.promotion.findMany({
      where: { userId },
      include: promotionInclude,
      orderBy: { createdAt: 'desc' },
    });

    res.json(promotions);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ error: 'Failed to fetch promotions' });
  }
});

// POST /api/promotions
promotionsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { name, promoPrice, items } = req.body;

    if (!name || promoPrice == null || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'name, promoPrice e items son requeridos' });
      return;
    }

    // Verify all products belong to this user
    const productIds: number[] = items.map((i: any) => Number(i.productId));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, userId },
    });
    if (products.length !== productIds.length) {
      res.status(403).json({ error: 'Uno o más productos no pertenecen a este usuario' });
      return;
    }

    const promotion = await prisma.promotion.create({
      data: {
        name,
        promoPrice: Number(promoPrice),
        userId,
        items: {
          create: items.map((i: any) => ({
            productId: Number(i.productId),
            quantity: Number(i.quantity),
          })),
        },
      },
      include: promotionInclude,
    });

    res.status(201).json(promotion);
  } catch (error) {
    console.error('Error creating promotion:', error);
    res.status(500).json({ error: 'Failed to create promotion' });
  }
});

// PUT /api/promotions/:id
promotionsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const promotion = await prisma.promotion.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!promotion) { res.status(404).json({ error: 'Promotion not found' }); return; }
    if (promotion.userId !== userId) { res.status(403).json({ error: 'Unauthorized' }); return; }

    const { name, promoPrice, isActive, items } = req.body;

    // If items are provided, verify ownership and replace all
    if (items !== undefined) {
      const productIds: number[] = items.map((i: any) => Number(i.productId));
      const products = await prisma.product.findMany({
        where: { id: { in: productIds }, userId },
      });
      if (products.length !== productIds.length) {
        res.status(403).json({ error: 'Uno o más productos no pertenecen a este usuario' });
        return;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (items !== undefined) {
        await tx.promotionItem.deleteMany({ where: { promotionId: promotion.id } });
        await tx.promotionItem.createMany({
          data: items.map((i: any) => ({
            promotionId: promotion.id,
            productId: Number(i.productId),
            quantity: Number(i.quantity),
          })),
        });
      }
      return tx.promotion.update({
        where: { id: promotion.id },
        data: {
          ...(name !== undefined && { name }),
          ...(promoPrice !== undefined && { promoPrice: Number(promoPrice) }),
          ...(isActive !== undefined && { isActive }),
        },
        include: promotionInclude,
      });
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(500).json({ error: 'Failed to update promotion' });
  }
});

// DELETE /api/promotions/:id
promotionsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const promotion = await prisma.promotion.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!promotion) { res.status(404).json({ error: 'Promotion not found' }); return; }
    if (promotion.userId !== userId) { res.status(403).json({ error: 'Unauthorized' }); return; }

    // Desvincula transactions antes de borrar (SetNull via Prisma relation)
    await prisma.promotion.delete({ where: { id: promotion.id } });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(500).json({ error: 'Failed to delete promotion' });
  }
});
