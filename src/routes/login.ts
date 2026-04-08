import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import validator from "validator";
import winston from "winston";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET no está definido en las variables de entorno. Configúralo para seguridad.");
}

const JWT_SECRET = process.env.JWT_SECRET;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'security.log' }),
    new winston.transports.Console()
  ]
});

// Blacklist de tokens revocados (en memoria para simplicidad; usa Redis en producción)
const tokenBlacklist = new Set<string>();


export const loginRouter = Router();
const prisma = new PrismaClient();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos por IP
  message: "Demasiados intentos de login. Inténtalo de nuevo en 15 minutos.",
  standardHeaders: true,
  legacyHeaders: false,
});

loginRouter.post("/", loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña son requeridos" });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Email inválido" });
    }
    const user = await prisma.user.findUnique({ where: {  email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    logger.info('Login exitoso', { email: normalizedEmail, ip: req.ip, userId: user.id });

    res.status(200).json({
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      token, // Retorna el token con el userId en la claim sub
    });
  } catch (error) {
    res.status(500).json({ error: "Error interno al iniciar sesión" });
  }
});


// Validar token
loginRouter.post("/validate-session", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ valid: false, error: "Token requerido" });
  }

  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ valid: false, error: "Token revocado" });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.sub) },
      select: { id: true, email: true, nombre: true, apellido: true },
    });

    if (!user) {
      return res.status(401).json({ valid: false, error: "Usuario no encontrado" });
    }

    res.status(200).json({ valid: true, user });
  } catch (error) {
    res.status(401).json({ valid: false, error: "Token inválido o expirado" });
  }
});

// Logout: Revoca el token agregándolo a la blacklist
loginRouter.post("/logout", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token requerido" });
  }

  try {
    // Verifica que el token sea válido antes de revocarlo
    jwt.verify(token, JWT_SECRET);
    tokenBlacklist.add(token);
    logger.info('Token revocado en logout', { ip: req.ip });
    res.status(200).json({ message: "Logout exitoso" });
  } catch (error) {
    res.status(401).json({ error: "Token inválido" });
  }
});
