import "dotenv/config";
import path from "node:path";
import { randomUUID } from "node:crypto";
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

function startOfWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // segunda-feira
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function parseDateParam(value: any) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}


function extractDriveFileId(url: string) {
  const raw = String(url || "").trim();
  if (!raw.includes("drive.google.com")) return "";

  try {
    const parsed = new URL(raw);
    const fromQuery = parsed.searchParams.get("id");
    if (fromQuery) return fromQuery;

    const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    if (match?.[1]) return match[1];
  } catch {
    const match = raw.match(/\/file\/d\/([^/]+)/) || raw.match(/[?&]id=([^&]+)/);
    if (match?.[1]) return match[1];
  }

  return "";
}

function isBlockedProxyTarget(url: URL) {
  const host = url.hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function resolvePdfProxyUrl(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  const driveId = extractDriveFileId(raw);
  if (driveId) {
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`;
  }

  const parsed = new URL(raw);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Link inválido");
  }
  if (isBlockedProxyTarget(parsed)) {
    throw new Error("Destino não permitido");
  }

  return parsed.toString();
}

function normalizePdfBuffer(buffer: Buffer) {
  const marker = buffer.indexOf(Buffer.from("%PDF-"));
  if (marker === 0) return buffer;
  // Alguns provedores colocam poucos bytes antes do cabeçalho do PDF.
  // O PDF.js precisa receber o arquivo começando em %PDF-.
  if (marker > 0 && marker < 2048) return buffer.subarray(marker);
  return null;
}

function looksLikePdf(buffer: Buffer) {
  return !!normalizePdfBuffer(buffer);
}

function getHeader(headers: Headers, name: string) {
  return headers.get(name) || headers.get(name.toLowerCase()) || "";
}

function absoluteUrl(baseUrl: string, maybeUrl: string) {
  try {
    return new URL(maybeUrl.replaceAll("&amp;", "&"), baseUrl).toString();
  } catch {
    return "";
  }
}

function extractDriveConfirmUrl(html: string, baseUrl: string) {
  const decoded = html.replaceAll("\\u003d", "=").replaceAll("\\u0026", "&");

  const hrefMatches = [
    /href="([^"]*(?:uc\?|drive\.usercontent\.google\.com\/download)[^"]*)"/i,
    /downloadUrl"\s*:\s*"([^"]+)"/i,
    /action="([^"]*(?:uc\?|drive\.usercontent\.google\.com\/download)[^"]*)"/i,
  ];

  for (const re of hrefMatches) {
    const match = decoded.match(re);
    if (match?.[1]) {
      const url = absoluteUrl(baseUrl, match[1]);
      if (url) return url;
    }
  }

  const confirm = decoded.match(/[?&]confirm=([0-9A-Za-z_\-]+)/)?.[1];
  const id = decoded.match(/[?&]id=([0-9A-Za-z_\-]+)/)?.[1];
  if (confirm && id) {
    return `https://drive.google.com/uc?export=download&confirm=${encodeURIComponent(confirm)}&id=${encodeURIComponent(id)}`;
  }

  return "";
}

async function fetchBuffer(url: string, cookie = "") {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 RF-Fitness-PDF-Viewer",
      "accept": "application/pdf,application/octet-stream,*/*;q=0.8",
      ...(cookie ? { cookie } : {}),
    },
  });

  const contentType = getHeader(response.headers, "content-type");
  const setCookie = response.headers.getSetCookie?.().join("; ") || getHeader(response.headers, "set-cookie");
  const buffer = Buffer.from(await response.arrayBuffer());
  return { response, contentType, setCookie, buffer };
}

async function fetchPublicPdf(input: string) {
  const raw = String(input || "").trim();
  const driveId = extractDriveFileId(raw);

  const urls = driveId
    ? [
        `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`,
        `https://drive.usercontent.google.com/download?id=${encodeURIComponent(driveId)}&export=download&authuser=0&confirm=t`,
        `https://docs.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`,
      ]
    : [resolvePdfProxyUrl(raw)];

  let lastStatus = 0;
  let lastContentType = "";
  let lastHtml = "";

  for (const url of urls) {
    const first = await fetchBuffer(url);
    lastStatus = first.response.status;
    lastContentType = first.contentType;

    if (!first.response.ok) continue;

    const firstPdf = normalizePdfBuffer(first.buffer);
    if (firstPdf) {
      return { buffer: firstPdf, contentType: "application/pdf" };
    }

    const text = first.buffer.slice(0, 150000).toString("utf8");
    lastHtml = text;
    if (/text\/html/i.test(first.contentType) || /<html|<!doctype|drive-viewer|google/i.test(text)) {
      lastHtml = text;
      const confirmUrl = extractDriveConfirmUrl(text, first.response.url || url);
      if (confirmUrl) {
        const second = await fetchBuffer(confirmUrl, first.setCookie);
        lastStatus = second.response.status;
        lastContentType = second.contentType;
        const secondPdf = normalizePdfBuffer(second.buffer);
        if (second.response.ok && secondPdf) {
          return { buffer: secondPdf, contentType: "application/pdf" };
        }
        lastHtml = second.buffer.slice(0, 150000).toString("utf8");
      }
    }
  }

  if (driveId && /sign in|login|acesso negado|permission|not authorized|não autorizado/i.test(lastHtml)) {
    throw new Error("O Google Drive não liberou o arquivo para download público. No Drive, deixe como 'Qualquer pessoa com o link: Leitor'.");
  }

  throw new Error(
    lastStatus
      ? `O link não retornou um PDF válido. Status ${lastStatus}${lastContentType ? ` (${lastContentType})` : ""}.`
      : "O link não retornou um PDF válido."
  );
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


  // ===== PDF INTERNO =====
  // Evita abrir o PDF pelo visualizador nativo/Drive dentro do iframe no iPhone.
  // Registra com /api e sem /api para funcionar em qualquer configuração do servidor/nginx.
  async function pdfProxyHandler(req: any, reply: any) {
    try {
      const rawUrl = String(req.query?.url || "").trim();
      if (!rawUrl) return reply.code(400).send({ message: "Link do PDF não informado" });

      const { buffer, contentType } = await fetchPublicPdf(rawUrl);

      reply
        .header("Content-Type", /pdf/i.test(contentType) ? contentType : "application/pdf")
        .header("Content-Length", String(buffer.length))
        .header("Accept-Ranges", "none")
        .header("Cache-Control", "private, no-store, max-age=0")
        .header("X-Content-Type-Options", "nosniff");

      return reply.send(buffer);
    } catch (error: any) {
      return reply.code(400).send({ message: error?.message || "Link inválido" });
    }
  }
  app.get(`${API_PREFIX}/pdf-proxy`, { preHandler: (app as any).auth }, pdfProxyHandler);
  if (API_PREFIX !== "") {
    app.get(`/pdf-proxy`, { preHandler: (app as any).auth }, pdfProxyHandler);
  }

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

    const out: Record<string, string> = { training: "", diet: "", supp: "", cardio: "", cardioName: "", cardioTime: "", cardioIntensity: "", cardioDays: "", exams: "", stretch: "" };
    for (const d of docs) out[normKey(d.docType)] = d.url;

    return out;
  });


  // ===== ITENS EXTRAS - ALUNO =====
  app.get(`${API_PREFIX}/extra-items`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = req.user as JwtPayload;

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return reply.code(404).send({ message: "Usuário não encontrado" });
    if (!user.active) return reply.code(403).send({ message: "Usuário desativado" });

    const items = await (prisma as any).studentExtraItem.findMany({
      where: { userId: user.id, active: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return {
      items: items.map((item: any) => ({
        id: item.id,
        title: item.title,
        category: item.category || "outros",
        sourceType: item.sourceType || "link",
        url: item.url,
        notes: item.notes || "",
        active: item.active,
        order: item.order,
      })),
    };
  });

  // ===== ADMIN =====
  app.get(`${API_PREFIX}/admin/users`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;
  
    const q = String(req.query?.q || "").trim();

    const terms = q
      .split(/\s+/)
      .filter(Boolean);
    
      const users = await prisma.user.findMany({
        where: {
          role: "student",
          ...(terms.length
            ? {
                AND: terms.map((t) => ({
                  OR: [
                    { name: { contains: t, mode: "insensitive" } },
                    { email: { contains: t, mode: "insensitive" } },
                  ],
                })),
              }
            : {}),
        },
        orderBy: [{ createdAt: "desc" }],
        take: 500,
        select: {
          email: true,
          name: true,
          active: true,
          createdAt: true,
        },
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

    const out: Record<string, string> = { training: "", diet: "", supp: "", cardio: "", cardioName: "", cardioTime: "", cardioIntensity: "", cardioDays: "", exams: "", stretch: "" };
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
      cardio: z.string().optional(),
      cardioName: z.string().optional(),
      cardioTime: z.string().optional(),
      cardioIntensity: z.string().optional(),
      cardioDays: z.string().optional(),
      exams: z.string().optional(),
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
    const out: Record<string, string> = { training: "", diet: "", supp: "", cardio: "", cardioName: "", cardioTime: "", cardioIntensity: "", cardioDays: "", exams: "", stretch: "" };
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


  // ===== ITENS EXTRAS - ADMIN =====
  app.get(`${API_PREFIX}/admin/users/:email/extra-items`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const email = normEmail(req.params.email);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "student") return reply.code(404).send({ message: "Aluno não encontrado" });

    const items = await (prisma as any).studentExtraItem.findMany({
      where: { userId: user.id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return {
      items: items.map((item: any) => ({
        id: item.id,
        title: item.title,
        category: item.category || "outros",
        sourceType: item.sourceType || "link",
        url: item.url,
        notes: item.notes || "",
        active: item.active,
        order: item.order,
      })),
    };
  });

  app.put(`${API_PREFIX}/admin/users/:email/extra-items`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const email = normEmail(req.params.email);
    const schema = z.object({
      items: z.array(z.object({
        title: z.string().trim().min(1),
        url: z.string().trim().min(1),
        notes: z.string().optional().nullable(),
        active: z.boolean().optional(),
        order: z.number().int().optional(),
        category: z.string().optional().nullable(),
        sourceType: z.string().optional().nullable(),
      })).default([]),
    });
    const body = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "student") return reply.code(404).send({ message: "Aluno não encontrado" });

    await prisma.$transaction(async (tx: any) => {
      await tx.studentExtraItem.deleteMany({ where: { userId: user.id } });

      for (const [idx, item] of body.items.entries()) {
        const title = String(item.title || "").trim();
        const url = String(item.url || "").trim();
        if (!title || !url) continue;

        await tx.studentExtraItem.create({
          data: {
            userId: user.id,
            title,
            url,
            notes: String(item.notes || "").trim() || null,
            active: item.active ?? true,
            order: item.order ?? idx,
            category: String(item.category || "outros").trim() || "outros",
            sourceType: String(item.sourceType || "link").trim() || "link",
          },
        });
      }
    });

    const items = await (prisma as any).studentExtraItem.findMany({
      where: { userId: user.id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return { ok: true, items };
  });



  // ===== TREINOS MANUAIS - ALUNO =====
  app.get(`${API_PREFIX}/workouts`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = req.user as JwtPayload;

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return reply.code(404).send({ message: "Usuário não encontrado" });
    if (!user.active) return reply.code(403).send({ message: "Usuário desativado" });

    const workouts = await (prisma as any).workout.findMany({
      where: { userId: user.id, active: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: {
        exercises: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          include: {
            exercise: { include: { video: true, muscleGroup: true } },
            series: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
          },
        },
      },
    });

    const currentWeekStart = startOfWeek();
    const seriesIds = workouts.flatMap((w: any) => w.exercises.flatMap((we: any) => we.series.map((s: any) => s.id)));
    const logs = seriesIds.length
      ? await (prisma as any).studentWorkoutLog.findMany({
          where: { userId: user.id, seriesId: { in: seriesIds } },
          orderBy: { createdAt: "desc" },
        })
      : [];

    const sessions = workouts.length
      ? await (prisma as any).studentWorkoutSession.findMany({
          where: { userId: user.id, workoutId: { in: workouts.map((w: any) => w.id) }, weekStart: currentWeekStart },
          orderBy: { createdAt: "desc" },
        })
      : [];
      interface Session {
        workoutId: string;
        notes?: string | null;
      }

      const sessionByWorkout = new Map<string, { notes?: string | null }>();
      for (const s of sessions as Session[]) {
        if (!sessionByWorkout.has(s.workoutId)) {
          sessionByWorkout.set(s.workoutId, { notes: s.notes });
        }
      }
    const lastBySeriesSet = new Map<string, any>();
    for (const log of logs) {
      const key = `${log.seriesId}:${log.setIndex ?? 0}`;
      if (!lastBySeriesSet.has(key)) lastBySeriesSet.set(key, log);
    }

    return {
      workouts: workouts.map((w: any) => ({
        id: w.id,
        title: w.title,
        notes: w.notes || "",
        order: w.order,
        sessionNotes: sessionByWorkout.get(w.id)?.notes || "",
        weekStart: currentWeekStart.toISOString(),
        exercises: w.exercises.map((we: any) => ({
          id: we.id,
          notes: we.notes || "",
          order: we.order,
          technique: we.techniqueName ? {
            id: we.techniqueId || "",
            name: we.techniqueName || "",
            videoUrl: we.techniqueVideoUrl || "",
            notes: we.techniqueNotes || "",
            exerciseNote: we.techniqueNote || "",
          } : null,
          exercise: {
            id: we.exercise.id,
            name: we.exercise.name,
            videoUrl: we.exercise.video?.url || "",
            videoTitle: we.exercise.video?.title || "",
            muscleGroup: we.exercise.muscleGroup?.name || "",
          },
          series: we.series.map((serie: any) => {
            const count = Math.max(1, Number(serie.count || 1));
            const lastSets = Array.from({ length: count }, (_, index) => {
              const last = lastBySeriesSet.get(`${serie.id}:${index}`);
              return {
                setIndex: index,
                lastWeight: last?.weight ?? null,
                lastPerformedReps: last?.performedReps ?? null,
              };
            });
            return {
              id: serie.id,
              targetReps: serie.targetReps,
              count,
              order: serie.order,
              lastSets,
            };
          }),
        })),
      })),
    };
  });

  app.post(`${API_PREFIX}/student/workouts/:workoutId/logs`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = req.user as JwtPayload;
    const workoutId = String(req.params.workoutId || "");

    const schema = z.object({
      notes: z.string().trim().max(2000).optional().nullable(),
      logs: z.array(z.object({
        seriesId: z.string().min(1),
        setIndex: z.union([z.number().int(), z.string(), z.null()]).optional(),
        weight: z.union([z.number(), z.string(), z.null()]).optional(),
        performedReps: z.union([z.number().int(), z.string(), z.null()]).optional(),
      })).min(1),
    });
    const body = schema.parse(req.body);

    const workout = await (prisma as any).workout.findFirst({ where: { id: workoutId, userId: payload.sub } });
    if (!workout) return reply.code(404).send({ message: "Treino não encontrado" });

    const seriesIds = body.logs.map((l) => l.seriesId);
    const validSeries = await (prisma as any).workoutSeries.findMany({
      where: { id: { in: seriesIds }, workoutExercise: { workoutId } },
      include: {
        workoutExercise: {
          include: {
            exercise: { include: { muscleGroup: true } },
            workout: { select: { title: true } },
          },
        },
      },
    });
    const validById = new Map<string, any>(validSeries.map((s: any) => [s.id, s]));
    const validSet = new Set(validSeries.map((s: any) => s.id));

    const weekStart = startOfWeek();

    const baseData = body.logs
      .filter((l) => validSet.has(l.seriesId))
      .map((l) => {
        const wRaw = l.weight === "" || l.weight === null || typeof l.weight === "undefined" ? null : Number(l.weight);
        const rRaw = l.performedReps === "" || l.performedReps === null || typeof l.performedReps === "undefined" ? null : Number(l.performedReps);
        const setRaw = l.setIndex === "" || l.setIndex === null || typeof l.setIndex === "undefined" ? 0 : Number(l.setIndex);
        return {
          userId: payload.sub,
          workoutId,
          seriesId: l.seriesId,
          setIndex: Number.isFinite(setRaw) && setRaw >= 0 ? Math.trunc(setRaw) : 0,
          weight: Number.isFinite(wRaw as number) ? wRaw : null,
          performedReps: Number.isFinite(rRaw as number) ? Math.trunc(rRaw as number) : null,
          workoutTitle: validById.get(l.seriesId)?.workoutExercise?.workout?.title || workout.title || null,
          exerciseName: validById.get(l.seriesId)?.workoutExercise?.exercise?.name || null,
          muscleGroup: validById.get(l.seriesId)?.workoutExercise?.exercise?.muscleGroup?.name || null,
          targetReps: validById.get(l.seriesId)?.targetReps || null,
        };
      })
      .filter((l) => l.weight !== null || l.performedReps !== null);

    if (!baseData.length) return reply.code(400).send({ message: "Nenhum registro válido para salvar" });

    // IMPORTANTE: não usar createMany aqui.
    // Com Prisma 7 + @prisma/adapter-pg, createMany pode gerar ON CONFLICT mesmo sem skipDuplicates,
    // e isso quebra quando a constraint única antiga foi removida para permitir múltiplas execuções.
    const result = await (prisma as any).$transaction(async (tx: any) => {
      const sessionId = randomUUID();

      // SQL direto para evitar erro do Prisma/Postgres:
      // "there is no unique or exclusion constraint matching the ON CONFLICT specification".
      await tx.$executeRawUnsafe(
        `INSERT INTO "StudentWorkoutSession" ("id", "userId", "workoutId", "weekStart", "notes", "createdAt")
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        sessionId,
        payload.sub,
        workoutId,
        weekStart,
        body.notes || null
      );

      for (const item of baseData) {
        await tx.$executeRawUnsafe(
          `INSERT INTO "StudentWorkoutLog"
            ("id", "userId", "workoutId", "seriesId", "sessionId", "setIndex", "weight", "performedReps",
             "workoutTitle", "exerciseName", "muscleGroup", "targetReps", "createdAt")
           VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)`,
          randomUUID(),
          item.userId,
          item.workoutId,
          item.seriesId,
          sessionId,
          item.setIndex,
          item.weight,
          item.performedReps,
          item.workoutTitle,
          item.exerciseName,
          item.muscleGroup,
          item.targetReps
        );
      }

      return { sessionId, saved: baseData.length };
    });

    return { ok: true, ...result };
  });


  app.get(`${API_PREFIX}/student/workouts/history`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = req.user as JwtPayload;

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return reply.code(404).send({ message: "Usuário não encontrado" });
    if (!user.active) return reply.code(403).send({ message: "Usuário desativado" });

    const logs = await (prisma as any).studentWorkoutLog.findMany({
      where: { userId: payload.sub },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        workout: { select: { title: true } },
        session: { select: { id: true, notes: true, createdAt: true, weekStart: true } },
        series: {
          include: {
            workoutExercise: {
              include: { exercise: { include: { muscleGroup: true } } },
            },
          },
        },
      },
    });

    const grouped = new Map<string, any>();

    for (const log of logs) {
      const created = new Date(log.createdAt);
      const fallbackKey = `${created.toISOString().slice(0, 16)}:${log.workoutTitle || log.workout?.title || "Treino"}`;
      const key = log.sessionId ? `${log.sessionId}:${created.toISOString().slice(0, 16)}` : fallbackKey;

      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          date: log.createdAt,
          weekStart: log.session?.weekStart || null,
          workoutTitle: log.workoutTitle || log.workout?.title || "Treino",
          notes: log.session?.notes || "",
          logs: [],
        });
      }

      grouped.get(key).logs.push({
        id: log.id,
        date: log.createdAt,
        setIndex: log.setIndex ?? 0,
        weight: log.weight,
        performedReps: log.performedReps,
        targetReps: log.targetReps || log.series?.targetReps || "",
        exerciseName: log.exerciseName || log.series?.workoutExercise?.exercise?.name || "",
        muscleGroup: log.muscleGroup || log.series?.workoutExercise?.exercise?.muscleGroup?.name || "",
      });
    }

    return { records: Array.from(grouped.values()).slice(0, 80) };
  });

  // ===== TREINOS MANUAIS - ADMIN =====

  app.get(`${API_PREFIX}/admin/muscle-groups`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = await requireAdmin(req, reply);
    if (!payload) return;
    const muscleGroups = await (prisma as any).muscleGroup.findMany({ orderBy: { name: "asc" } });
    return { muscleGroups };
  });

  app.post(`${API_PREFIX}/admin/muscle-groups`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = await requireAdmin(req, reply);
    if (!payload) return;
    const schema = z.object({ name: z.string().trim().min(2) });
    const body = schema.parse(req.body || {});
    const muscleGroup = await (prisma as any).muscleGroup.upsert({
      where: { name: body.name },
      update: {},
      create: { name: body.name },
    });
    return { ok: true, muscleGroup };
  });

  app.patch(`${API_PREFIX}/admin/muscle-groups/:id`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = await requireAdmin(req, reply);
    if (!payload) return;
    const id = String(req.params.id || "");
    const schema = z.object({ name: z.string().trim().min(2) });
    const body = schema.parse(req.body || {});
    const muscleGroup = await (prisma as any).muscleGroup.update({ where: { id }, data: { name: body.name } });
    return { ok: true, muscleGroup };
  });

  app.delete(`${API_PREFIX}/admin/muscle-groups/:id`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = await requireAdmin(req, reply);
    if (!payload) return;
    const id = String(req.params.id || "");
    await (prisma as any).exercise.updateMany({ where: { muscleGroupId: id }, data: { muscleGroupId: null } });
    await (prisma as any).muscleGroup.delete({ where: { id } });
    return { ok: true };
  });

  app.get(`${API_PREFIX}/admin/videos`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = await requireAdmin(req, reply);
    if (!payload) return;
    const videos = await (prisma as any).video.findMany({ orderBy: { title: "asc" } });
    return { videos };
  });

  app.post(`${API_PREFIX}/admin/videos`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = await requireAdmin(req, reply);
    if (!payload) return;
    const schema = z.object({ title: z.string().trim().min(2), url: z.string().trim().min(3) });
    const body = schema.parse(req.body || {});
    const video = await (prisma as any).video.upsert({
      where: { title: body.title },
      update: { url: body.url },
      create: { title: body.title, url: body.url },
    });
    return { ok: true, video };
  });

  app.patch(`${API_PREFIX}/admin/videos/:id`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = await requireAdmin(req, reply);
    if (!payload) return;
    const id = String(req.params.id || "");
    const schema = z.object({ title: z.string().trim().min(2), url: z.string().trim().min(3) });
    const body = schema.parse(req.body || {});
    const video = await (prisma as any).video.update({ where: { id }, data: { title: body.title, url: body.url } });
    return { ok: true, video };
  });

  app.delete(`${API_PREFIX}/admin/videos/:id`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = await requireAdmin(req, reply);
    if (!payload) return;
    const id = String(req.params.id || "");
    await (prisma as any).exercise.updateMany({ where: { videoId: id }, data: { videoId: null } });
    await (prisma as any).video.delete({ where: { id } });
    return { ok: true };
  });

  app.get(`${API_PREFIX}/admin/exercises`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;
    const q = String(req.query?.q || "").trim();
    const exercises = await (prisma as any).exercise.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : {},
      take: 300,
      orderBy: { name: "asc" },
      include: { video: true, muscleGroup: true },
    });
    return { exercises: exercises.map((e: any) => ({
      id: e.id,
      name: e.name,
      muscleGroup: e.muscleGroup?.name || "",
      videoUrl: e.video?.url || "",
      videoTitle: e.video?.title || "",
    })) };
  });

  app.post(`${API_PREFIX}/admin/exercises`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;
    const schema = z.object({
      name: z.string().trim().min(2),
      muscleGroup: z.string().trim().optional().nullable(),
      videoUrl: z.string().trim().optional().nullable(),
      videoTitle: z.string().trim().optional().nullable(),
    });
    const body = schema.parse(req.body);
    const exercise = await upsertExercise(body.name, body.muscleGroup || "", body.videoUrl || "", body.videoTitle || body.name);
    return { ok: true, exercise };
  });

  app.patch(`${API_PREFIX}/admin/exercises/:id`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;
    const id = String(req.params.id || "");
    const schema = z.object({
      name: z.string().trim().min(2),
      muscleGroup: z.string().trim().optional().nullable(),
      videoUrl: z.string().trim().optional().nullable(),
      videoTitle: z.string().trim().optional().nullable(),
    });
    const body = schema.parse(req.body || {});

    let muscleGroupId: string | null = null;
    const muscleName = String(body.muscleGroup || "").trim();
    if (muscleName) {
      const mg = await (prisma as any).muscleGroup.upsert({
        where: { name: muscleName },
        update: {},
        create: { name: muscleName },
      });
      muscleGroupId = mg.id;
    }

    let videoId: string | null = null;
    const videoUrl = String(body.videoUrl || "").trim();
    if (videoUrl) {
      const title = String(body.videoTitle || body.name).trim() || body.name;
      const video = await (prisma as any).video.upsert({
        where: { title },
        update: { url: videoUrl },
        create: { title, url: videoUrl },
      });
      videoId = video.id;
    }

    const exercise = await (prisma as any).exercise.update({ where: { id }, data: { name: body.name, muscleGroupId, videoId } });
    return { ok: true, exercise };
  });

  app.delete(`${API_PREFIX}/admin/exercises/:id`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;
    const id = String(req.params.id || "");
    const used = await (prisma as any).workoutExercise.count({ where: { exerciseId: id } });
    if (used > 0) {
      return reply.code(409).send({ message: "Este exercício já está vinculado a treino. Remova dos treinos antes de excluir." });
    }
    await (prisma as any).exercise.delete({ where: { id } });
    return { ok: true };
  });


  // ===== TÉCNICAS DE TREINO - ADMIN =====
  app.get(`${API_PREFIX}/admin/techniques`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = await requireAdmin(req, reply);
    if (!payload) return;
    const techniques = await (prisma as any).trainingTechnique.findMany({ orderBy: { name: "asc" } });
    return { techniques };
  });

  app.post(`${API_PREFIX}/admin/techniques`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = await requireAdmin(req, reply);
    if (!payload) return;
    const schema = z.object({
      name: z.string().trim().min(2, "Informe o nome da técnica"),
      videoUrl: z.string().trim().optional().nullable(),
      notes: z.string().trim().optional().nullable(),
    });
    const body = schema.parse(req.body || {});
    const technique = await (prisma as any).trainingTechnique.upsert({
      where: { name: body.name },
      update: { videoUrl: body.videoUrl || null, notes: body.notes || null },
      create: { name: body.name, videoUrl: body.videoUrl || null, notes: body.notes || null },
    });
    return { ok: true, technique };
  });

  app.patch(`${API_PREFIX}/admin/techniques/:id`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = await requireAdmin(req, reply);
    if (!payload) return;
    const id = String(req.params.id || "");
    const schema = z.object({
      name: z.string().trim().min(2, "Informe o nome da técnica"),
      videoUrl: z.string().trim().optional().nullable(),
      notes: z.string().trim().optional().nullable(),
    });
    const body = schema.parse(req.body || {});
    const technique = await (prisma as any).trainingTechnique.update({
      where: { id },
      data: { name: body.name, videoUrl: body.videoUrl || null, notes: body.notes || null },
    });

    await (prisma as any).workoutExercise.updateMany({
      where: { techniqueId: id },
      data: {
        techniqueName: technique.name,
        techniqueVideoUrl: technique.videoUrl,
        techniqueNotes: technique.notes,
      },
    });

    return { ok: true, technique };
  });

  app.delete(`${API_PREFIX}/admin/techniques/:id`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    const payload = await requireAdmin(req, reply);
    if (!payload) return;
    const id = String(req.params.id || "");
    await (prisma as any).workoutExercise.updateMany({
      where: { techniqueId: id },
      data: {
        techniqueId: null,
        techniqueName: null,
        techniqueVideoUrl: null,
        techniqueNotes: null,
        techniqueNote: null,
      },
    });
    await (prisma as any).trainingTechnique.delete({ where: { id } });
    return { ok: true };
  });

  async function upsertExercise(nameRaw: string, muscleRaw = "", videoUrlRaw = "", videoTitleRaw = "") {
    const name = String(nameRaw || "").trim();
    const muscleName = String(muscleRaw || "").trim();
    const videoUrl = String(videoUrlRaw || "").trim();
    const videoTitle = String(videoTitleRaw || name).trim() || name;

    let muscleGroupId: string | null = null;
    if (muscleName) {
      const mg = await (prisma as any).muscleGroup.upsert({
        where: { name: muscleName },
        update: {},
        create: { name: muscleName },
      });
      muscleGroupId = mg.id;
    }

    let videoId: string | null = null;
    if (videoUrl) {
      const video = await (prisma as any).video.upsert({
        where: { title: videoTitle },
        update: { url: videoUrl },
        create: { title: videoTitle, url: videoUrl },
      });
      videoId = video.id;
    }

    const existing = await (prisma as any).exercise.findFirst({ where: { name, muscleGroupId } });
    if (existing) {
      return (prisma as any).exercise.update({ where: { id: existing.id }, data: { videoId } });
    }
    return (prisma as any).exercise.create({ data: { name, muscleGroupId, videoId } });
  }

  const workoutInputSchema = z.object({
    title: z.string().trim().min(1),
    notes: z.string().optional().nullable(),
    active: z.boolean().optional(),
    order: z.number().int().optional(),
    exercises: z.array(z.object({
      exerciseId: z.string().optional().nullable(),
      name: z.string().trim().min(2),
      muscleGroup: z.string().optional().nullable(),
      videoUrl: z.string().optional().nullable(),
      videoTitle: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      techniqueId: z.string().optional().nullable(),
      techniqueName: z.string().optional().nullable(),
      techniqueVideoUrl: z.string().optional().nullable(),
      techniqueNotes: z.string().optional().nullable(),
      techniqueNote: z.string().optional().nullable(),
      order: z.number().int().optional(),
      series: z.array(z.object({
        count: z.number().int().min(1).optional(),
        reps: z.string().trim().optional().nullable(),
        targetReps: z.string().trim().min(1),
        order: z.number().int().optional(),
      })).min(1),
    })).min(1),
  });

  app.get(`${API_PREFIX}/admin/users/:email/workouts`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;
    const email = normEmail(req.params.email);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "student") return reply.code(404).send({ message: "Aluno não encontrado" });

    const workouts = await (prisma as any).workout.findMany({
      where: { userId: user.id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: {
        exercises: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          include: { exercise: { include: { video: true, muscleGroup: true } }, series: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } },
        },
      },
    });

    return { workouts: workouts.map((w: any) => ({
      id: w.id,
      title: w.title,
      notes: w.notes || "",
      active: w.active,
      order: w.order,
      exercises: w.exercises.map((we: any) => ({
        id: we.id,
        exerciseId: we.exercise.id,
        name: we.exercise.name,
        muscleGroup: we.exercise.muscleGroup?.name || "",
        videoUrl: we.exercise.video?.url || "",
        videoTitle: we.exercise.video?.title || "",
        notes: we.notes || "",
        techniqueId: we.techniqueId || null,
        techniqueName: we.techniqueName || "",
        techniqueVideoUrl: we.techniqueVideoUrl || "",
        techniqueNotes: we.techniqueNotes || "",
        techniqueNote: we.techniqueNote || "",
        order: we.order,
        series: we.series.map((s: any) => ({ id: s.id, count: s.count || 1, reps: s.targetReps, targetReps: s.targetReps, order: s.order })),
      })),
    })) };
  });

  app.put(`${API_PREFIX}/admin/users/:email/workouts`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;
    const email = normEmail(req.params.email);
    const schema = z.object({ workouts: z.array(workoutInputSchema).default([]) });
    const body = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "student") return reply.code(404).send({ message: "Aluno não encontrado" });

    await prisma.$transaction(async (tx: any) => {
      await tx.workout.deleteMany({ where: { userId: user.id } });

      for (const [wi, workout] of body.workouts.entries()) {
        const createdWorkout = await tx.workout.create({
          data: {
            userId: user.id,
            title: workout.title,
            notes: workout.notes || null,
            active: workout.active ?? true,
            order: workout.order ?? wi,
          },
        });

        for (const [ei, item] of workout.exercises.entries()) {
          let exerciseId = item.exerciseId || "";
          if (!exerciseId) {
            const createdExercise = await upsertExercise(item.name, item.muscleGroup || "", item.videoUrl || "", item.videoTitle || item.name);
            exerciseId = createdExercise.id;
          }

          const we = await tx.workoutExercise.create({
            data: {
              workoutId: createdWorkout.id,
              exerciseId,
              notes: item.notes || null,
              techniqueId: item.techniqueId || null,
              techniqueName: item.techniqueName || null,
              techniqueVideoUrl: item.techniqueVideoUrl || null,
              techniqueNotes: item.techniqueNotes || null,
              techniqueNote: item.techniqueNote || null,
              order: item.order ?? ei,
            },
          });

          for (const [si, serie] of item.series.entries()) {
            const count = Math.max(1, Number(serie.count || 1));
            const reps = String(serie.reps || serie.targetReps || "").replace(/^\s*\d+\s*x\s*/i, "").trim();
            await tx.workoutSeries.create({
              data: {
                workoutExerciseId: we.id,
                count,
                targetReps: reps || String(serie.targetReps || "").trim(),
                order: serie.order ?? si,
              },
            });
          }
        }
      }
    });

    return { ok: true };
  });



  // ===== REGISTROS DE EXECUÇÃO - ADMIN =====
  app.get(`${API_PREFIX}/admin/workout-records`, { preHandler: (app as any).auth }, async (req: any, reply: any) => {
    if (!requireAdmin(req, reply)) return;

    const email = normEmail(String(req.query?.email || ""));
    const from = parseDateParam(req.query?.from);
    const to = parseDateParam(req.query?.to);

    const where: any = {};
    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || user.role !== "student") return reply.code(404).send({ message: "Aluno não encontrado" });
      where.userId = user.id;
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const logs = await (prisma as any).studentWorkoutLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 1000,
      include: {
        user: { select: { name: true, email: true } },
        workout: { select: { title: true } },
        session: { select: { id: true, notes: true, createdAt: true, weekStart: true } },
        series: {
          include: {
            workoutExercise: {
              include: { exercise: { include: { muscleGroup: true } } },
            },
          },
        },
      },
    });

    const grouped = new Map<string, any>();

    for (const log of logs) {
      const created = new Date(log.createdAt);
      const fallbackKey = `${log.userId}:${created.toISOString().slice(0, 16)}:${log.workoutTitle || log.workout?.title || "Treino"}`;
      const key = log.sessionId ? `${log.sessionId}:${created.toISOString().slice(0, 16)}` : fallbackKey;

      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          date: log.createdAt,
          weekStart: log.session?.weekStart || null,
          studentName: log.user?.name || "",
          studentEmail: log.user?.email || "",
          workoutTitle: log.workoutTitle || log.workout?.title || "Treino",
          notes: log.session?.notes || "",
          logs: [],
        });
      }

      grouped.get(key).logs.push({
        id: log.id,
        date: log.createdAt,
        setIndex: log.setIndex ?? 0,
        weight: log.weight,
        performedReps: log.performedReps,
        targetReps: log.targetReps || log.series?.targetReps || "",
        exerciseName: log.exerciseName || log.series?.workoutExercise?.exercise?.name || "",
        muscleGroup: log.muscleGroup || log.series?.workoutExercise?.exercise?.muscleGroup?.name || "",
      });
    }

    return { records: Array.from(grouped.values()).slice(0, 200) };
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
