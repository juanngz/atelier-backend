# Atelier — Documentación Técnica

---

## 1. Arquitectura General

La aplicación está dividida en **dos repositorios independientes** deployados en Vercel:

```
├── atelier-frontend   →  React + Vite + TypeScript
└── atelier-backend    →  Node.js + Express + Prisma + PostgreSQL (Neon)
```

```
Usuario
  │
  ▼
[Vercel — Frontend]          [Vercel — Backend]          [Neon — PostgreSQL]
 React SPA                    Express API                  Base de datos cloud
 atelier-frontend-nine         atelier-backend-git-         ep-late-shape-...
 .vercel.app                   deploy-juanngzs-projects     .neon.tech
                               .vercel.app
```

El frontend llama al backend via HTTP. El backend consulta la base de datos PostgreSQL hosteada en Neon.

---

## 2. Cómo Funciona la App

### Frontend
- **React Router** maneja la navegación entre páginas (Login, Register, Dashboard, Inventory, Sales).
- Al hacer login, el backend devuelve un **JWT token** que se guarda en `localStorage`.
- Todas las llamadas autenticadas incluyen ese token en el header `Authorization: Bearer <token>`.
- El archivo `src/utils/api.ts` centraliza todas las llamadas autenticadas — cualquier fetch que requiera login pasa por `authenticatedFetch()`.

### Backend
- **Express** recibe las requests y las rutea.
- El `authMiddleware` verifica el JWT en cada ruta protegida antes de ejecutar el handler.
- **Prisma** es el ORM que traduce las operaciones a SQL para PostgreSQL.
- Cada usuario solo puede ver y modificar sus propios productos y transacciones.

### Autenticación (flujo completo)
```
1. Usuario ingresa email + contraseña
2. POST /api/login → backend verifica bcrypt hash
3. Si OK → devuelve JWT firmado con JWT_SECRET (expira en 7 días)
4. Frontend guarda el token en localStorage
5. Cada request siguiente incluye el token → authMiddleware lo verifica
6. JWT contiene userId → backend filtra datos por ese userId
```

### Modelos de datos
```
User
  ├── id, nombre, apellido, dni, email, password, creadoAt
  └── products[]  (relación 1:N)

Product
  ├── id, name, price, stock, unidad, category, image, description
  ├── createdAt, updatedAt
  ├── userId (FK → User)
  └── transactions[]  (relación 1:N)

Transaction
  ├── id, amount, quantity, customer, status (PAID|REFUNDED|PENDING)
  ├── createdAt, updatedAt
  └── productId (FK → Product)
```

---

## 3. Cómo Funciona el Deploy

### Repos y branches
| Repo | Branch activo | Qué hace Vercel |
|------|---------------|-----------------|
| `juanngz/atelier-frontend` | `main` | Buildea Vite y sirve archivos estáticos |
| `juanngz/atelier-backend` | `main` | Corre Express como función serverless |

### Proceso automático
Cada vez que pusheás a `main`, Vercel detecta el cambio y despliega automáticamente.

### Variables de entorno en Vercel
**Backend (atelier-backend):**
| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string de Neon PostgreSQL |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT |

**Frontend (atelier-frontend):**
| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL del backend en Vercel |

> ⚠️ Las variables de Vite (`VITE_*`) se hornean en el bundle al momento del build. Si las cambiás en Vercel, necesitás hacer un nuevo deploy para que tomen efecto.

### Cómo deployar un cambio
```bash
# 1. Hacé el cambio en el código
# 2. Comiteá y pusheá a main de tu repo
git add -A
git commit -m "descripción del cambio"
git push mine main

# Vercel despliega automáticamente en ~2 minutos
```

---

## 4. Cómo Modificar Cosas

### Agregar un nuevo campo a un modelo
1. Editá `prisma/schema.prisma` — agregá el campo al modelo correspondiente.
2. Corrés `npx prisma migrate dev --name nombre_del_cambio` — crea y aplica la migración.
3. Actualizá el route correspondiente en `src/routes/` para leer/escribir ese campo.
4. Actualizá el frontend en `src/types.ts` y los componentes que usen ese modelo.
5. Pusheás a `main` → Vercel redespliega.

> ⚠️ Las migraciones se aplican automáticamente en desarrollo con `migrate dev`. En producción (Neon), tenés que correr `npx prisma migrate deploy` manualmente o agregarlo al build.

### Agregar una nueva ruta al backend
1. Creá el archivo en `src/routes/nueva-ruta.ts`.
2. Importá y montá el router en `src/index.ts`.
3. Si requiere auth, agregá `authMiddleware` como en las rutas existentes.

### Agregar una nueva página al frontend
1. Creá el archivo en `src/pages/NuevaPagina.tsx`.
2. Agregá la ruta en el archivo de routing (`App.tsx` o equivalente).
3. Agregá el link en el `Sidebar.tsx` si corresponde.

### Cambiar la base de datos
1. Entrá a Neon → Connection Details → copiá la nueva connection string.
2. Actualizá `DATABASE_URL` en Vercel → Settings → Environment Variables.
3. Corré `npx prisma migrate deploy` apuntando a la nueva DB.
4. Hacé redeploy en Vercel.

---

## 5. Seguridad — Temas a Tener en Cuenta

### ✅ Lo que ya está implementado
- **Passwords hasheados con bcrypt** (salt rounds: 10) — nunca se guarda la contraseña en texto plano.
- **JWT con expiración de 7 días** — los tokens no son eternos.
- **Rate limiting en /api/login** — máximo 5 intentos por IP cada 15 minutos.
- **Validación de emails** con la librería `validator`.
- **Autorización por recurso** — cada usuario solo puede acceder a sus propios productos y transacciones.
- **CORS restrictivo** — solo acepta requests desde el frontend en producción.

### ⚠️ Cosas a mejorar antes de ir a producción real
- **JWT_SECRET**: Usar una clave larga y random (mínimo 32 caracteres). Nunca commitearla al repo.
- **Token blacklist en memoria**: El logout actual revoca tokens en memoria — si el servidor reinicia, la blacklist se pierde. En producción usar Redis.
- **HTTPS only**: Vercel lo hace automáticamente ✅, pero si montás el backend en otro lado asegurate de forzarlo.
- **Secrets en el repo**: El `.env` ya está en `.gitignore` ✅. Nunca sacar esa línea.
- **Migración de production**: Actualmente no hay un script automático para correr migraciones en producción. Considerá agregar `prisma migrate deploy` al proceso de CI/CD.
- **Logs**: El servidor loggea eventos de seguridad en `security.log` pero ese archivo se pierde en Vercel (serverless sin filesystem persistente). Considerá un servicio externo como Logtail o Datadog.
- **Variables expuestas en el frontend**: `VITE_API_URL` es pública (está en el bundle JS). No pongas secretos en variables `VITE_*`.

### 🔴 Nunca hacer
- Commitear el `.env` al repositorio.
- Poner `JWT_SECRET` o `DATABASE_URL` en el código fuente.
- Usar `JWT_SECRET` débil como `"secret"` o `"password"` en producción.
- Deshabilitar el rate limiting del login.
- Exponer el Prisma Studio (`db:studio`) en producción.

---

## 6. Comandos Útiles

```bash
# Desarrollo local
npm run dev              # Inicia el servidor en localhost:4000

# Base de datos
npx prisma studio        # Interfaz visual para ver/editar la DB
npx prisma migrate dev --name nombre   # Crear y aplicar migración
npx prisma migrate deploy              # Aplicar migraciones en producción
npm run db:seed          # Poblar la DB con datos de prueba

# Deploy
git push mine main       # Pushea a tu repo → Vercel despliega automáticamente
```

---

## 7. URLs de Producción

| Servicio | URL |
|----------|-----|
| Frontend | https://atelier-frontend-nine.vercel.app |
| Backend  | https://atelier-backend-git-deploy-juanngzs-projects.vercel.app |
| Health check | https://atelier-backend-git-deploy-juanngzs-projects.vercel.app/api/health |
| DB (Neon) | ep-late-shape-acbov5xw.sa-east-1.aws.neon.tech |
