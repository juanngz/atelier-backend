import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const productRouter = Router();

// GET /api/products — list all products (optional ?search= filter)
productRouter.get('/', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;

    const products = await prisma.product.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id — get a single product
productRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products — create a new product
productRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, price, stock, category, image, description } = req.body;

    const product = await prisma.product.create({
      data: { name, price, stock, category, image, description },
    });

    res.status(201).json(product);
  } catch (error: any) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id — update a product
productRouter.put('/:id', async (req: Request, res: Response) => {
  try {
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
productRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
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
