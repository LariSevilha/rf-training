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

function extractDriveFileId(url) {
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
function isBlockedProxyTarget(url) {
    const host = url.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || host.startsWith("10.") || host.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}
function resolvePdfProxyUrl(input) {
    const raw = String(input || "").trim();
    if (!raw) return "";
    const driveId = extractDriveFileId(raw);
    if (driveId) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`;
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Link inválido");
    if (isBlockedProxyTarget(parsed)) throw new Error("Destino não permitido");
    return parsed.toString();
}
function looksLikePdf(buffer) {
    return buffer.slice(0, 5).toString("utf8") === "%PDF-";
}
function getHeader(headers, name) {
    return headers.get(name) || headers.get(name.toLowerCase()) || "";
}
function absoluteUrl(baseUrl, maybeUrl) {
    try { return new URL(maybeUrl.replaceAll("&amp;", "&"), baseUrl).toString(); } catch { return ""; }
}
function extractDriveConfirmUrl(html, baseUrl) {
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
    if (confirm && id) return `https://drive.google.com/uc?export=download&confirm=${encodeURIComponent(confirm)}&id=${encodeURIComponent(id)}`;
    return "";
}
async function fetchBuffer(url, cookie = "") {
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
async function fetchPublicPdf(input) {
    const raw = String(input || "").trim();
    const driveId = extractDriveFileId(raw);
    const urls = driveId ? [
        `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`,
        `https://drive.usercontent.google.com/download?id=${encodeURIComponent(driveId)}&export=download&authuser=0&confirm=t`,
        `https://docs.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`,
    ] : [resolvePdfProxyUrl(raw)];
    let lastStatus = 0;
    let lastContentType = "";
    let lastHtml = "";
    for (const url of urls) {
        const first = await fetchBuffer(url);
        lastStatus = first.response.status;
        lastContentType = first.contentType;
        if (!first.response.ok) continue;
        if (looksLikePdf(first.buffer) || /application\/pdf/i.test(first.contentType)) {
            return { buffer: first.buffer, contentType: first.contentType || "application/pdf" };
        }
        const text = first.buffer.slice(0, 150000).toString("utf8");
        if (/text\/html/i.test(first.contentType) || /<html|<!doctype/i.test(text)) {
            lastHtml = text;
            const confirmUrl = extractDriveConfirmUrl(text, first.response.url || url);
            if (confirmUrl) {
                const second = await fetchBuffer(confirmUrl, first.setCookie);
                lastStatus = second.response.status;
                lastContentType = second.contentType;
                if (second.response.ok && (looksLikePdf(second.buffer) || /application\/pdf/i.test(second.contentType))) {
                    return { buffer: second.buffer, contentType: second.contentType || "application/pdf" };
                }
            }
        }
    }
    if (driveId && /sign in|login|acesso negado|permission|not authorized|não autorizado/i.test(lastHtml)) {
        throw new Error("O Google Drive não liberou o arquivo para download público. No Drive, deixe como 'Qualquer pessoa com o link: Leitor'.");
    }
    throw new Error(lastStatus ? `O link não retornou um PDF válido. Status ${lastStatus}${lastContentType ? ` (${lastContentType})` : ""}.` : "O link não retornou um PDF válido.");
}

async function main() {
    const app = Fastify({ logger: true });
    // CORS: libera Authorization + PUT/PATCH/DELETE
    await app.register(cors, {
        origin: ["http://localhost:3000", "http://192.168.0.111:3000"],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    });
    await app.register(jwt, { secret: process.env.JWT_SECRET });
    app.decorate("auth", async (req, reply) => {
        try {
            await req.jwtVerify();
        }
        catch {
            return reply.code(401).send({ message: "Não autorizado" });
        }
    });
    function requireAdmin(req, reply) {
        const payload = req.user;
        if (payload.role !== "admin") {
            reply.code(403).send({ message: "Somente admin" });
            return false;
        }
        return true;
    }
    app.get("/health", async () => ({ ok: true }));

    // ===== PDF INTERNO =====
    async function pdfProxyHandler(req, reply) {
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
        } catch (error) {
            return reply.code(400).send({ message: error?.message || "Link inválido" });
        }
    }
    app.get("/api/pdf-proxy", { preHandler: app.auth }, pdfProxyHandler);
    app.get("/pdf-proxy", { preHandler: app.auth }, pdfProxyHandler);
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
        if (!user)
            return reply.code(401).send({ message: "Email ou senha inválidos" });
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok)
            return reply.code(401).send({ message: "Email ou senha inválidos" });
        const token = app.jwt.sign({ role: user.role }, { sub: user.id, expiresIn: "2h" });
        return {
            token,
            user: { email: user.email, active: user.active, role: user.role }
        };
    });
    app.get("/me", { preHandler: app.auth }, async (req) => {
        const payload = req.user;
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user)
            return { user: null };
        return { user: { email: user.email, active: user.active, role: user.role } };
    });
    // ===== ALUNO =====
    app.get("/documents", { preHandler: app.auth }, async (req, reply) => {
        const payload = req.user;
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user)
            return reply.code(404).send({ message: "Usuário não encontrado" });
        if (!user.active)
            return reply.code(403).send({ message: "Usuário desativado" });
        const docs = await prisma.studentDocument.findMany({
            where: { userId: user.id }
        });
        const out = { training: "", diet: "", supp: "" };
        for (const d of docs)
            out[d.docType] = d.url;
        return out;
    });
    // ===== ADMIN =====
    // Listar alunos (search)
    app.get("/admin/users", { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
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
    app.post("/admin/users", { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const schema = z.object({
            email: z.string().email(),
            password: z.string().min(6),
            active: z.boolean().optional()
        });
        const { email, password, active } = schema.parse(req.body);
        const normalized = email.toLowerCase();
        const exists = await prisma.user.findUnique({ where: { email: normalized } });
        if (exists)
            return reply.code(409).send({ message: "Usuário já existe" });
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
    app.get("/admin/users/:email", { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
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
    app.get("/admin/users/:email/documents", { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const email = String(req.params.email).toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "student")
            return reply.code(404).send({ message: "Aluno não encontrado" });
        const docs = await prisma.studentDocument.findMany({ where: { userId: user.id } });
        const out = { training: "", diet: "", supp: "" };
        for (const d of docs)
            out[d.docType] = d.url;
        return out;
    });
    // Ativar/desativar
    app.patch("/admin/users/:email", { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const email = String(req.params.email).toLowerCase();
        const schema = z.object({ active: z.boolean() });
        const { active } = schema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "student")
            return reply.code(404).send({ message: "Aluno não encontrado" });
        const updated = await prisma.user.update({ where: { email }, data: { active } });
        return { ok: true, user: { email: updated.email, active: updated.active } };
    });
    // Salvar documentos (upsert)
    app.put("/admin/users/:email/documents", { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const email = String(req.params.email).toLowerCase();
        const schema = z.object({
            training: z.string().optional(),
            diet: z.string().optional(),
            supp: z.string().optional()
        });
        const body = schema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "student")
            return reply.code(404).send({ message: "Aluno não encontrado" });
        const entries = Object.entries(body).filter(([_, v]) => typeof v === "string");
        for (const [docType, url] of entries) {
            await prisma.studentDocument.upsert({
                where: { userId_docType: { userId: user.id, docType } },
                update: { url: url, updatedAt: new Date() },
                create: { userId: user.id, docType, url: url }
            });
        }
        return { ok: true };
    });
    // Reset senha
    app.patch("/admin/users/:email/password", { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const email = String(req.params.email).toLowerCase();
        const schema = z.object({ password: z.string().min(6) });
        const { password } = schema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "student")
            return reply.code(404).send({ message: "Aluno não encontrado" });
        const passwordHash = await bcrypt.hash(password, 10);
        await prisma.user.update({ where: { email }, data: { passwordHash } });
        return { ok: true };
    });
    // Deletar aluno (hard delete)
    app.delete("/admin/users/:email", { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const email = String(req.params.email).toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "student")
            return reply.code(404).send({ message: "Aluno não encontrado" });
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
