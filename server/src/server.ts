import "dotenv/config";
import path from "node:path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import bcrypt from "bcrypt";
import { z } from "zod";
import fastifyStatic from "@fastify/static";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type JwtPayload = { sub: string; role: "admin" | "student" };

function normEmail(v: string) {
  return String(v || "").trim().toLowerCase();
}
function normKey(v: string) {
  return String(v || "").trim().toLowerCase();
}

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.register(jwt, { secret: process.env.JWT_SECRET! });

  // ✅ SERVE O WEB/ COMO SITE (PWA)
  // Assim /manifest.webmanifest e /service-worker.js deixam de dar 404
  app.register(fastifyStatic, {
    root: path.join(__dirname, "../../web"),
    prefix: "/", // serve em /
    index: false, // não forçar index.html (você usa /pages/*)
  });

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

  const API_PREFIX = process.env.API_PREFIX ?? "/api"; // default /api

  // Health
  app.get(`${API_PREFIX}/health`, async () => ({ ok: true }));

  // ===== AUTH =====
  app.post(`${API_PREFIX}/auth/login`, async (req, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });

    const { email, password } = schema.parse(req.body);
    const normalized = normEmail(email);

    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user) return reply.code(401).send({ message: "Email ou senha inválidos" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return reply.code(401).send({ message: "Email ou senha inválidos" });

    const token = app.jwt.sign(
      { role: user.role as JwtPayload["role"] },
      { sub: user.id, expiresIn: "2h" }
    );

    return {
      token,
      user: {
        email: user.email,
        name: user.name,
        active: user.active,
        role: user.role,
      },
    };
  });

  app.get(`${API_PREFIX}/me`, { preHandler: (app as any).auth }, async (req: any) => {
    const payload = req.user as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return { user: null };
    return {
      user: {
        email: user.email,
        name: user.name,
        active: user.active,
        role: user.role,
      },
    };
  });

  // ===== ALUNO =====
  app.get(`${API_PREFIX}/documents`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = req.user as JwtPayload;

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return reply.code(404).send({ message: "Usuário não encontrado" });
    if (!user.active) return reply.code(403).send({ message: "Usuário desativado" });

    const docs = await prisma.studentDocument.findMany({ where: { userId: user.id } });

    const out: Record<string, string> = { training: "", diet: "", supp: "", stretch: "" };
    for (const d of docs) out[normKey(d.docType)] = d.url;

    return out;
  });

  // ===== ADMIN =====

  app.get(`${API_PREFIX}/admin/users`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const q = normKey(String(req.query?.q || ""));

    const users = await prisma.user.findMany({
      where: {
        role: "student",
        ...(q ? { email: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { email: true, name: true, active: true, createdAt: true },
    });

    return { users };
  });

  app.post(`${API_PREFIX}/admin/users`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      active: z.boolean().optional(),
      name: z.string().min(2).max(80).optional(),
    });

    const { email, password, active, name } = schema.parse(req.body);
    const normalized = normEmail(email);

    const exists = await prisma.user.findUnique({ where: { email: normalized } });
    if (exists) return reply.code(409).send({ message: "Usuário já existe" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalized,
        name: name?.trim() || null,
        passwordHash,
        role: "student",
        active: active ?? true,
      },
      select: { email: true, name: true, active: true, role: true, createdAt: true },
    });

    return { ok: true, user };
  });

  // ===== ME (UPDATE) =====
  app.patch(`${API_PREFIX}/me`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = req.user as JwtPayload;

    const schema = z.object({
      name: z.string().trim().min(2).max(80).optional().nullable(),
      email: z.string().email().optional().nullable(),
    });

    const body = schema.parse(req.body);

    const me = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!me) return reply.code(404).send({ message: "Usuário não encontrado" });

    const data: any = {};

    if ("name" in body) {
      const cleanName = String(body.name ?? "").trim();
      data.name = cleanName ? cleanName : null;
    }

    if ("email" in body) {
      const newEmail = normEmail(body.email ?? "");
      if (!newEmail) return reply.code(400).send({ message: "Email inválido" });

      if (newEmail !== me.email) {
        const exists = await prisma.user.findUnique({ where: { email: newEmail } });
        if (exists) return reply.code(409).send({ message: "Email já está em uso" });
        data.email = newEmail;
      }
    }

    const updated = await prisma.user.update({
      where: { id: me.id },
      data,
      select: { email: true, name: true, active: true, role: true },
    });

    return { ok: true, user: updated };
  });

  app.patch(`${API_PREFIX}/me/password`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = req.user as JwtPayload;

    const schema = z.object({ password: z.string().min(6) });
    const { password } = schema.parse(req.body);

    const me = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!me) return reply.code(404).send({ message: "Usuário não encontrado" });

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: me.id },
      data: { passwordHash },
    });

    return { ok: true };
  });

  app.patch(`${API_PREFIX}/admin/users/:email/profile`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const email = normEmail(req.params.email);

    const schema = z.object({
      name: z.string().trim().min(2).max(80).optional().nullable(),
    });

    const { name } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "student") return reply.code(404).send({ message: "Aluno não encontrado" });

    const clean = (name ?? "").toString().trim();
    const updated = await prisma.user.update({
      where: { email },
      data: { name: clean ? clean : null },
      select: { email: true, name: true },
    });
 
    return { ok: true, user: updated };
  });

  app.patch(`${API_PREFIX}/admin/users/:email`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const email = normEmail(req.params.email);

    const schema = z.object({ active: z.boolean() });
    const { active } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "student") return reply.code(404).send({ message: "Aluno não encontrado" });

    const updated = await prisma.user.update({ where: { email }, data: { active } });
    return { ok: true, user: { email: updated.email, active: updated.active } };
  });

  app.get(`${API_PREFIX}/admin/users/:email/documents`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const email = normEmail(req.params.email);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "student") return reply.code(404).send({ message: "Aluno não encontrado" });

    const docs = await prisma.studentDocument.findMany({ where: { userId: user.id } });

    const out: Record<string, string> = { training: "", diet: "", supp: "", stretch: "" };
    for (const d of docs) out[normKey(d.docType)] = d.url;

    return out;
  });

  app.put(`${API_PREFIX}/admin/users/:email/documents`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const email = normEmail(req.params.email);

    const schema = z.object({
      training: z.string().optional(),
      diet: z.string().optional(),
      supp: z.string().optional(),
      stretch: z.string().optional(),
    });

    const body = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "student") return reply.code(404).send({ message: "Aluno não encontrado" });

    for (const [docTypeRaw, url] of Object.entries(body)) {
      if (typeof url === "undefined") continue;

      const docType = normKey(docTypeRaw);
      const clean = String(url).trim();

      if (clean === "") {
        await prisma.studentDocument.deleteMany({ where: { userId: user.id, docType } });
        continue;
      }

      const existing = await prisma.studentDocument.findFirst({
        where: { userId: user.id, docType },
      });

      if (existing) {
        await prisma.studentDocument.update({
          where: { id: existing.id },
          data: { url: clean, updatedAt: new Date() },
        });
      } else {
        await prisma.studentDocument.create({
          data: { userId: user.id, docType, url: clean },
        });
      }
    }

    const docs = await prisma.studentDocument.findMany({ where: { userId: user.id } });
    const out: Record<string, string> = { training: "", diet: "", supp: "", stretch: "" };
    for (const d of docs) out[normKey(d.docType)] = d.url;

    return out;
  });

  app.patch(`${API_PREFIX}/admin/users/:email/password`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const email = normEmail(req.params.email);

    const schema = z.object({ password: z.string().min(6) });
    const { password } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "student") return reply.code(404).send({ message: "Aluno não encontrado" });

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { email }, data: { passwordHash } });

    return { ok: true };
  });

  app.delete(`${API_PREFIX}/admin/users/:email`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const email = normEmail(req.params.email);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "student") return reply.code(404).send({ message: "Aluno não encontrado" });

    await prisma.studentDocument.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { email } });

    return { ok: true };
  });

  const port = Number(process.env.PORT) || 3333;
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
