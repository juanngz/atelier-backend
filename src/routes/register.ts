import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { Router } from "express";
import validator from "validator";

export const registerRouter = Router();
const prisma = new PrismaClient();

registerRouter.post("/", async (req, res) => {
  const { nombre, apellido, email, password } = req.body;

  try {
    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Email inválido" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(400).json({ error: "El email ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        nombre,
        apellido,
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    res.status(201).json({
      id: newUser.id,
      nombre: newUser.nombre,
      apellido: newUser.apellido,
      email: newUser.email,
      createdAt: newUser.creadoAt,
    });
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    res.status(500).json({ error: "Error interno al registrar usuario" });
  }
});
