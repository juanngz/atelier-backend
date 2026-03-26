ARQUITECTURA DEL BACKEND — GestionLocal
========================================

Descripción General
-------------------
Backend construido con Node.js + Express + Prisma + PostgreSQL.
Provee una API REST para gestionar productos, ventas y un dashboard de métricas.
Puerto por defecto: 4000


Estructura de Carpetas
-----------------------
GestionLocal-BackEnd/
├── prisma/
│   ├── schema.prisma      → Modelos de datos (Product, Transaction)
│   ├── migrations/         → Historial de migraciones de la base de datos
│   └── seed.ts             → Script para poblar la DB con datos iniciales
├── src/
│   ├── index.ts            → Punto de entrada. Configura Express, CORS y monta las rutas
│   └── routes/
│       ├── products.ts     → CRUD completo de productos (GET, POST, PUT, DELETE)
│       ├── sales.ts        → Registro de ventas, métricas y listado de transacciones
│       └── dashboard.ts    → Endpoint que agrega métricas, gráfico semanal y transacciones recientes
├── .env                    → Variables de entorno (DATABASE_URL, PORT)
├── package.json
└── tsconfig.json


Modelos de Datos (Prisma)
--------------------------
Product
  - id           (Int, autoincrement, PK)
  - name         (String)
  - price        (Float)
  - stock        (Int, default 0)
  - category     (String)
  - image        (String)
  - description  (String, opcional)
  - createdAt    (DateTime)
  - updatedAt    (DateTime)
  - transactions (relación 1:N con Transaction)

Transaction
  - id           (Int, autoincrement, PK)
  - productId    (Int, FK → Product)
  - customer     (String, default "Anonymous")
  - amount       (Float)
  - quantity     (Int, default 1)
  - status       (String: "PAID" | "REFUNDED" | "PENDING")
  - createdAt    (DateTime)
  - updatedAt    (DateTime)


Endpoints API
--------------
GET    /api/products          → Listar productos (acepta ?search=)
GET    /api/products/:id      → Obtener un producto
POST   /api/products          → Crear producto
PUT    /api/products/:id      → Actualizar producto
DELETE /api/products/:id      → Eliminar producto

GET    /api/sales             → Listar transacciones (incluye datos del producto)
GET    /api/sales/stats       → Métricas: ventas del día, AOV, total transacciones
POST   /api/sales             → Registrar venta (decrementa stock atómicamente)
PUT    /api/sales/:id         → Actualizar transacción (ej: reembolso)

GET    /api/dashboard         → Datos agregados: ingresos, gráfico 7 días, transacciones recientes

GET    /api/health            → Health check


Cómo Ejecutar
--------------
1. Instalar dependencias:  npm install
2. Configurar .env con DATABASE_URL (PostgreSQL)
3. Migrar la base de datos: npx prisma migrate dev
4. Iniciar servidor:        npm run dev

Dependencias Principales
--------------------------
- express         → Framework HTTP
- @prisma/client  → ORM para PostgreSQL
- cors            → Manejo de CORS
- tsx             → Ejecución de TypeScript en desarrollo
