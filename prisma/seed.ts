import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const products = [
  {
    name: 'Minimalist Trench Coat',
    price: 1240.00,
    stock: 42,
    unidad: 'cajas',
    category: 'Ready-to-wear • Seasonal',
  },
  {
    name: 'Silk Evening Blouse',
    price: 450.00,
    stock: 3,
    unidad: 'cajas',
    category: 'Silk Atelier • Eveningwear',
  },
  {
    name: 'Architectural Heel',
    price: 890.00,
    stock: 18,
    unidad: 'cajas',
    category: 'Footwear • Sculptural',
  },
  {
    name: 'Cashmere Scarf',
    price: 320.00,
    stock: 104,
    unidad: 'cajas',
    category: 'Accessories • Winter',
  },
  {
    name: 'Organic Cotton Set',
    price: 89.00,
    stock: 55,
    unidad: 'unidades',
    category: 'Artisanal • Sustainable',
  },
  {
    name: 'Hand-Carved Brooch',
    price: 45.50,
    stock: 12,
    unidad: 'cajas',
    category: 'Accessories • Handcrafted',
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Create a default user with hashed password
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      nombre: 'Demo',
      apellido: 'User',
      email: 'demo@example.com',
      password: hashedPassword,
    },
  });

  console.log(`✅ Created user: ${user.nombre} ${user.apellido}`);

  // Create products for the user
  for (const product of products) {
    await prisma.product.create({
      data: {
        ...product,
        userId: user.id,
      },
    });
  }

  const productCount = await prisma.product.count();
  console.log(`✅ Seeded ${productCount} products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
