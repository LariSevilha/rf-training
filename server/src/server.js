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

    function cleanRedirectUrlServer(value) {
        const raw = String(value || "").trim();
        if (!raw)
            return "";
        try {
            const parsed = new URL(raw);
            const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
            const isGoogleRedirect = /(^|\.)google\.[a-z.]+$/.test(host) && ["/url", "/interstitial", "/search"].includes(parsed.pathname);
            if (isGoogleRedirect) {
                const real = parsed.searchParams.get("q") || parsed.searchParams.get("url") || parsed.searchParams.get("u");
                if (real)
                    return cleanRedirectUrlServer(real);
            }
            if ((host === "youtube.com" || host === "youtu.be") && parsed.pathname === "/redirect") {
                const real = parsed.searchParams.get("q") || parsed.searchParams.get("url");
                if (real)
                    return cleanRedirectUrlServer(real);
            }
            return parsed.href;
        }
        catch {
            return raw;
        }
    }
    function getDriveFileIdServer(parsed) {
        return (parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ||
            parsed.pathname.match(/\/document\/d\/([^/]+)/)?.[1] ||
            parsed.pathname.match(/\/spreadsheets\/d\/([^/]+)/)?.[1] ||
            parsed.searchParams.get("id") ||
            "");
    }
    function normalizePdfDownloadUrlServer(value) {
        const clean = cleanRedirectUrlServer(value);
        if (!clean)
            return "";
        try {
            const parsed = new URL(clean);
            const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
            if (host.endsWith("drive.google.com")) {
                const id = getDriveFileIdServer(parsed);
                if (id)
                    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}&confirm=t`;
            }
            if (host.endsWith("docs.google.com")) {
                const id = getDriveFileIdServer(parsed);
                if (id && parsed.pathname.includes("/document/d/")) {
                    return `https://docs.google.com/document/d/${encodeURIComponent(id)}/export?format=pdf`;
                }
            }
            if (host.endsWith("dropbox.com")) {
                parsed.searchParams.set("dl", "1");
                return parsed.href;
            }
            return parsed.href;
        }
        catch {
            return clean;
        }
    }
    function isBlockedProxyHost(hostname) {
        const host = String(hostname || "").trim().toLowerCase();
        return (!host ||
            host === "localhost" ||
            host.endsWith(".localhost") ||
            host.endsWith(".local") ||
            host === "0.0.0.0" ||
            host === "127.0.0.1" ||
            /^127\./.test(host) ||
            /^10\./.test(host) ||
            /^192\.168\./.test(host) ||
            /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
            host === "::1" ||
            host === "[::1]");
    }
    function assertAllowedPdfTarget(value) {
        const parsed = new URL(value);
        if (!["http:", "https:"].includes(parsed.protocol) || isBlockedProxyHost(parsed.hostname)) {
            throw new Error("Link do PDF não permitido.");
        }
        return parsed;
    }
    function isPdfBuffer(buffer) {
        return buffer.length >= 5 && buffer.subarray(0, 5).toString("utf8") === "%PDF-";
    }
    function decodeHtmlEntities(value) {
        return String(value || "")
            .replace(/&amp;/g, "&")
            .replace(/&#38;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
    }
    function getSetCookieHeader(headers) {
        const anyHeaders = headers;
        const cookies = typeof anyHeaders.getSetCookie === "function" ? anyHeaders.getSetCookie() : [];
        if (Array.isArray(cookies) && cookies.length) {
            return cookies.map((cookie) => cookie.split(";")[0]).filter(Boolean).join("; ");
        }
        const single = headers.get("set-cookie") || "";
        return single ? single.split(",").map((cookie) => cookie.split(";")[0]).filter(Boolean).join("; ") : "";
    }
    function extractDownloadLinkFromGoogleHtml(html, baseUrl) {
        const text = decodeHtmlEntities(html);
        const patterns = [
            /href=["']([^"']*(?:\/uc\?export=download|drive\.usercontent\.google\.com\/download)[^"']*)["']/i,
            /href=["']([^"']*confirm=[^"']*id=[^"']*)["']/i,
            /downloadUrl["']?\s*[:=]\s*["']([^"']+)["']/i,
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern)?.[1];
            if (!match)
                continue;
            try {
                return new URL(match, baseUrl).href;
            }
            catch {
                // continua procurando
            }
        }
        return "";
    }
    async function fetchPdfBufferServer(url, depth = 0, cookieHeader = "") {
        if (depth > 8)
            throw new Error("Redirecionamentos demais ao baixar o PDF.");
        const parsed = assertAllowedPdfTarget(url);
        const headers = {
            "User-Agent": "Mozilla/5.0 RF-Training-PDF-Viewer/2.0",
            "Accept": "application/pdf,application/octet-stream,text/html,*/*;q=0.8",
        };
        if (cookieHeader)
            headers.Cookie = cookieHeader;
        const response = await fetch(parsed.href, {
            redirect: "manual",
            headers,
        });
        const setCookie = getSetCookieHeader(response.headers);
        const nextCookies = [cookieHeader, setCookie].filter(Boolean).join("; ");
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("location");
            if (!location)
                throw new Error("Redirecionamento do PDF sem destino.");
            const nextUrl = new URL(location, parsed.href).href;
            return fetchPdfBufferServer(nextUrl, depth + 1, nextCookies);
        }
        if (!response.ok) {
            throw new Error("Não foi possível baixar o PDF. Verifique se o link está público/compartilhável.");
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get("content-type") || "";
        if (isPdfBuffer(buffer))
            return buffer;
        const looksHtml = contentType.includes("text/html") || buffer.subarray(0, 128).toString("utf8").toLowerCase().includes("<html");
        const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
        const isGoogleFile = host.endsWith("drive.google.com") || host.endsWith("googleusercontent.com") || host.endsWith("docs.google.com");
        if (looksHtml && isGoogleFile) {
            const html = buffer.toString("utf8");
            const downloadUrl = extractDownloadLinkFromGoogleHtml(html, parsed.href);
            if (downloadUrl) {
                return fetchPdfBufferServer(downloadUrl, depth + 1, nextCookies);
            }
        }
        throw new Error("O link informado não retornou um arquivo PDF direto.");
    }
    async function handlePdfProxy(req, reply) {
        const schema = z.object({ url: z.string().min(1).max(5000) });
        const { url } = schema.parse(req.query || {});
        const target = normalizePdfDownloadUrlServer(url);
        try {
            const buffer = await fetchPdfBufferServer(target);
            reply
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "inline; filename=treino.pdf")
                .header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
                .header("Pragma", "no-cache");
            return reply.send(buffer);
        }
        catch (error) {
            req.log?.warn?.({ err: error, target }, "Falha no pdf-proxy");
            return reply.code(400).send({ message: error?.message || "Não foi possível carregar o PDF." });
        }
    }
    const pdfProxyRoutes = Array.from(new Set(["/api/pdf-proxy", "/pdf-proxy"]));
    for (const route of pdfProxyRoutes) {
        app.get(route, { preHandler: app.auth }, handlePdfProxy);
    }

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
