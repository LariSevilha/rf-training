import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import bcrypt from "bcrypt";
import { z } from "zod";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type JwtPayload = { sub: string; role: "admin" | "student" };

async function main() {
  const app = Fastify({ logger: true });

  // CORS: libera Authorization + PUT/PATCH/DELETE
  await app.register(cors, {
    origin: ["http://localhost:3000", "http://192.168.0.111:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  });

  await app.register(jwt, { secret: process.env.JWT_SECRET! });

  app.decorate("auth", async (req: any, reply: any) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ message: "Não autorizado" });
    }
  });

  function requireAdmin(req: any, reply: any) {
    const payload = req.user as JwtPayload;
    if (payload.role !== "admin") {
      reply.code(403).send({ message: "Somente admin" });
      return false;
    }
    return true;
  }

  app.get("/health", async () => ({ ok: true }));

  // ===== AUTH =====
  app.post("/auth/login", async (req, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    });
    const { email, password } = schema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    if (!user) return reply.code(401).send({ message: "Email ou senha inválidos" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return reply.code(401).send({ message: "Email ou senha inválidos" });

    const token = app.jwt.sign(
      { role: user.role as JwtPayload["role"] },
      { sub: user.id, expiresIn: "2h" }
    );

    return {
      token,
      user: { email: user.email, active: user.active, role: user.role }
    };
  });

  app.get("/me", { preHandler: (app as any).auth }, async (req: any) => {
    const payload = req.user as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return { user: null };
    return { user: { email: user.email, active: user.active, role: user.role } };
  });

  // ===== ALUNO =====
  app.get("/documents", { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = req.user as JwtPayload;

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return reply.code(404).send({ message: "Usuário não encontrado" });
    if (!user.active) return reply.code(403).send({ message: "Usuário desativado" });

    const docs = await prisma.studentDocument.findMany({
      where: { userId: user.id }
    });

    const out: Record<string, string> = { training: "", diet: "", supp: "" };
    for (const d of docs) out[d.docType] = d.url;

    return out;
  });

  // ===== ADMIN =====

  // Listar alunos (search)
  app.get("/admin/users", { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const q = String(req.query?.q || "").toLowerCase();

    const users = await prisma.user.findMany({
      where: {
        role: "student",
        ...(q ? { email: { contains: q, mode: "insensitive" } } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { email: true, active: true, createdAt: true }
    });

    return { users };
  });

  // Criar aluno
  app.post("/admin/users", { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      active: z.boolean().optional()
    });
    const { email, password, active } = schema.parse(req.body);

    const normalized = email.toLowerCase();

    const exists = await prisma.user.findUnique({ where: { email: normalized } });
    if (exists) return reply.code(409).send({ message: "Usuário já existe" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalized,
        passwordHash,
        role: "student",
        active: active ?? true
      },
      select: { email: true, active: true, role: true, createdAt: true }
    });

    return { ok: true, user };
  });

  // Buscar aluno
  app.get("/admin/users/:email", { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const email = String(req.params.email).toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true, active: true, role: true, createdAt: true }
    });

    if (!user || user.role !== "student") {
      return reply.code(404).send({ message: "Aluno não encontrado" });
    }

    return { user };
  });

  // Ver documentos do aluno
  app.get("/admin/users/:email/documents", { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const email = String(req.params.email).toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "student") return reply.code(404).send({ message: "Aluno não encontrado" });

    const docs = await prisma.studentDocument.findMany({ where: { userId: user.id } });

    const out: Record<string, string> = { training: "", diet: "", supp: "" };
    for (const d of docs) out[d.docType] = d.url;

    return out;
  });

  // Ativar/desativar
  app.patch("/admin/users/:email", { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const email = String(req.params.email).toLowerCase();
    const schema = z.object({ active: z.boolean() });
    const { active } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "student") return reply.code(404).send({ message: "Aluno não encontrado" });

    const updated = await prisma.user.update({ where: { email }, data: { active } });
    return { ok: true, user: { email: updated.email, active: updated.active } };
  });

  // Salvar documentos (upsert)
  app.put("/admin/users/:email/documents", { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const email = String(req.params.email).toLowerCase();

    const schema = z.object({
      training: z.string().optional(),
      diet: z.string().optional(),
      supp: z.string().optional()
    });
    const body = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "student") return reply.code(404).send({ message: "Aluno não encontrado" });

    const entries = Object.entries(body).filter(([_, v]) => typeof v === "string");

    for (const [docType, url] of entries) {
      await prisma.studentDocument.upsert({
        where: { userId_docType: { userId: user.id, docType } },
        update: { url: url!, updatedAt: new Date() },
        create: { userId: user.id, docType, url: url! }
      });
    }

    return { ok: true };
  });

  // Reset senha
  app.patch("/admin/users/:email/password", { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const email = String(req.params.email).toLowerCase();
    const schema = z.object({ password: z.string().min(6) });
    const { password } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "student") return reply.code(404).send({ message: "Aluno não encontrado" });

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { email }, data: { passwordHash } });

    return { ok: true };
  });

  // Deletar aluno (hard delete)
  app.delete("/admin/users/:email", { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const email = String(req.params.email).toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "student") return reply.code(404).send({ message: "Aluno não encontrado" });

    await prisma.studentDocument.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { email } });
    return { ok: true };
  });

  // start
  const port = 3333;
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
