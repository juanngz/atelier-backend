import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
export const productRouter = Router();

// GET /api/products — list all products (current user only)
productRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const products = await prisma.product.findMany({
      where: {
        AND: [
          { userId: userId },
          search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' as const } },
                  { category: { contains: search, mode: 'insensitive' as const } },
                ],
              }
            : {},
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id — get a single product
productRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    if (product.userId !== req.userId) {
      res.status(403).json({ error: 'Unauthorized: Product does not belong to this user' });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products — create a new product
productRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, price, stock, unidad, category, image, description } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!name || price === undefined) {
      res.status(400).json({ error: 'name and price are required' });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        price,
        stock: stock || 0,
        unidad: unidad || 'cajas',
        category: category || 'General',
        image: image || '',
        description: description || undefined,
        userId,
      },
    });

    res.status(201).json(product);
  } catch (error: any) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id — update a product
productRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!existingProduct) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    if (existingProduct.userId !== userId) {
      res.status(403).json({ error: 'Unauthorized: Product does not belong to this user' });
      return;
    }

    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });

    res.json(product);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id — delete a product
productRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!existingProduct) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    if (existingProduct.userId !== userId) {
      res.status(403).json({ error: 'Unauthorized: Product does not belong to this user' });
      return;
    }

    await prisma.product.delete({
      where: { id: Number(req.params.id) },
    });

    res.status(204).send();
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});
