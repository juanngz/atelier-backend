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
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADh9oOmtPkwjJFn2GzQVAyrCy-awTDiEj1tT0YGUiorZvl7lFQHO_M6RUmcVjd9jY6USLT-l9s4OS1u8op-69nyNRr7Nx5WXxMnb5Kn1UPO3WUbe3KIDpwqjxkQsiwAV3EtoDUFPO8xxEJYJn93KSET0JMCfdokoKxkBbGQGvOr4s_FBVOQJ8Sczx_6GrnpPIFs3racx3Aqxbivq_7LuqSZvXeDIrkVPlwBCYl_wwaQDJfaqR3ygIvZVziCTWncTrGl-RTcC3hiEir',
  },
  {
    name: 'Silk Evening Blouse',
    price: 450.00,
    stock: 3,
    unidad: 'cajas',
    category: 'Silk Atelier • Eveningwear',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBm2VjC2TXYwTdypXGfdSWAF1TWL20-YVDFcs-dA1Yl7jaQJvtTYsbFvvYKTo0tDyH3MGrweWsB46DOaAY81CCKPnpplYhvDKQRV2NkvlUFRwURiAUtOcQric9YQo2JanRLJJ_9BjobkiRirXq1_KlQY4UGIZ0XU4lKUTYHpcUHO6R-ve434nUhFiKL-uE4kfijs08-fKgQydOLe7sG5VxmtcMJ-9_waap4pnP054ZjuMbKZjztjNG_X037rkZvjAT6TFTbmUBTyXdr',
  },
  {
    name: 'Architectural Heel',
    price: 890.00,
    stock: 18,
    unidad: 'cajas',
    category: 'Footwear • Sculptural',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8-zeiLT-KwStC73TmIOBsBuyi0A5DSrfhdkXOawk_SKAYj0Bz-LpCI8Zwyia8qabsJaRS8KJm7IU6nqZl9Y9Y8dWKXd8uJcU_bGh1iDKPBEP1pXXqpwgUSs4HPMW5MC1HevQOA1T1DoxBrb-2ilwRLb9ZszFrxBpxRPWSHzYCahy9MToq6jpXVKlA52fPlMEeU7_JFXIoA4enTEqR_4_kkTBg1LsrvYzsukvkO9Y1i9AadJId4iaPKSNtAnjLrZOGhwWWbBX32l6z',
  },
  {
    name: 'Cashmere Scarf',
    price: 320.00,
    stock: 104,
    unidad: 'cajas',
    category: 'Accessories • Winter',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAaTZmE0tYlYxF0_lutM2X2Lcjd5pBmwlpzeu4gLmiUJr9kFk-7HqTSTnFuMo7PfPkSeH-IVSwqzZxGpkhEj9-dzYoASIKPdC85fWYf2VqPo1gNkr2iyK-Gaqeuj_WWmniWvKh2Z239NsiMV9YhFjRgvJBQdkPh0QlqVG2BIhE2NaqyQQbW9B2sg-mY75hbJWpUX5gn6i9EIXTqlHNSrm6Npu0ik9Gj-jbuazeFNT1JB1HMndqqY9CVjXUnxmciE9mO5l8yXJKDDSRz',
  },
  {
    name: 'Organic Cotton Set',
    price: 89.00,
    stock: 55,
    unidad: 'unidades',
    category: 'Artisanal • Sustainable',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBXL7IHZR2g0_Wiq9VqwdMVBESDQpVvpv2oKOjezRGT_vlsxwQaRtom3hoovbezAaFnKY1meHA_XaCG9QCx9J3TgJ8b_zsJd8pClzIcdIiN-lAR7804WE2AFN23O3Yw0Phcyl9N7V1B1bO6gwoeRAZn-2Me3QAg924KKAWSq23Rp-RucG3JcIgEAcW3n12yTstD3FCPDkqTzbMG14y6elq-yFhghpBIfM4AEP1b_ULrZT1yy2pQbSb_EvAf5KZum7A5_vg-5xEidPG8',
  },
  {
    name: 'Hand-Carved Brooch',
    price: 45.50,
    stock: 12,
    unidad: 'cajas',
    category: 'Accessories • Handcrafted',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3QKVn42OK_NRYVxBPXswLC4832tUR3jP28UIPLjvnxfX4jIbRpSMzyc8kkAq8WfDkma8iXYQQ_UJkJmcDjXznF1SQ-AkoeENzTcKb_-plfkc29Ukia4kEVLr3Y2O7BmI39axbXoXZFeOZnJSw2APpjA4W45uRWu7q4wXRcFuCCzj27LCL8WzM5HkbGhg8Mr6Y47KuLr9Pu8YRT6YIN1nvnu7ZCEiaHTViyYAm1S7Y_wsmzwhnQNPhbr0xy73Lq_ZvL-XYbrXx9aHB',
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
