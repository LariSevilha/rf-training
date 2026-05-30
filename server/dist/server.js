"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const node_path_1 = __importDefault(require("node:path"));
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const zod_1 = require("zod");
const static_1 = __importDefault(require("@fastify/static"));
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new client_1.PrismaClient({ adapter });
function normEmail(v) {
    return String(v || "").trim().toLowerCase();
}
function normKey(v) {
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
function parseDateParam(value) {
    const raw = String(value || "").trim();
    if (!raw)
        return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
}
async function main() {
    const app = (0, fastify_1.default)({ logger: true });
    await app.register(cors_1.default, {
        origin: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });
    await app.register(jwt_1.default, { secret: process.env.JWT_SECRET });
    // ✅ SERVE O WEB/ COMO SITE (PWA)
    // Assim /manifest.webmanifest e /service-worker.js deixam de dar 404
    app.register(static_1.default, {
        root: node_path_1.default.join(__dirname, "../../web"),
        prefix: "/", // serve em /
        index: false, // não forçar index.html (você usa /pages/*)
    });
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
    const API_PREFIX = process.env.API_PREFIX ?? "/api"; // default /api
    // Health
    app.get(`${API_PREFIX}/health`, async () => ({ ok: true }));
    // ===== AUTH =====
    app.post(`${API_PREFIX}/auth/login`, async (req, reply) => {
        const schema = zod_1.z.object({
            email: zod_1.z.string().email(),
            password: zod_1.z.string().min(1),
        });
        const { email, password } = schema.parse(req.body);
        const normalized = normEmail(email);
        const user = await prisma.user.findUnique({ where: { email: normalized } });
        if (!user)
            return reply.code(401).send({ message: "Email ou senha inválidos" });
        const ok = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!ok)
            return reply.code(401).send({ message: "Email ou senha inválidos" });
        const token = app.jwt.sign({ role: user.role }, { sub: user.id, expiresIn: "2h" });
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
    app.get(`${API_PREFIX}/me`, { preHandler: app.auth }, async (req) => {
        const payload = req.user;
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user)
            return { user: null };
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
    app.get(`${API_PREFIX}/documents`, { preHandler: app.auth }, async (req, reply) => {
        const payload = req.user;
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user)
            return reply.code(404).send({ message: "Usuário não encontrado" });
        if (!user.active)
            return reply.code(403).send({ message: "Usuário desativado" });
        const docs = await prisma.studentDocument.findMany({ where: { userId: user.id } });
        const out = { training: "", diet: "", supp: "", cardio: "", cardioName: "", cardioTime: "", cardioIntensity: "", cardioDays: "", exams: "", stretch: "" };
        for (const d of docs)
            out[normKey(d.docType)] = d.url;
        return out;
    });
    // ===== ITENS EXTRAS - ALUNO =====
    app.get(`${API_PREFIX}/extra-items`, { preHandler: app.auth }, async (req, reply) => {
        const payload = req.user;
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user)
            return reply.code(404).send({ message: "Usuário não encontrado" });
        if (!user.active)
            return reply.code(403).send({ message: "Usuário desativado" });
        const items = await prisma.studentExtraItem.findMany({
            where: { userId: user.id, active: true },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        });
        return {
            items: items.map((item) => ({
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
    app.get(`${API_PREFIX}/admin/users`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
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
    app.post(`${API_PREFIX}/admin/users`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const schema = zod_1.z.object({
            email: zod_1.z.string().email(),
            password: zod_1.z.string().min(6),
            active: zod_1.z.boolean().optional(),
            name: zod_1.z.string().min(2).max(80).optional(),
        });
        const { email, password, active, name } = schema.parse(req.body);
        const normalized = normEmail(email);
        const exists = await prisma.user.findUnique({ where: { email: normalized } });
        if (exists)
            return reply.code(409).send({ message: "Usuário já existe" });
        const passwordHash = await bcrypt_1.default.hash(password, 10);
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
    app.patch(`${API_PREFIX}/me`, { preHandler: app.auth }, async (req, reply) => {
        const payload = req.user;
        const schema = zod_1.z.object({
            name: zod_1.z.string().trim().min(2).max(80).optional().nullable(),
            email: zod_1.z.string().email().optional().nullable(),
        });
        const body = schema.parse(req.body);
        const me = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!me)
            return reply.code(404).send({ message: "Usuário não encontrado" });
        const data = {};
        if ("name" in body) {
            const cleanName = String(body.name ?? "").trim();
            data.name = cleanName ? cleanName : null;
        }
        if ("email" in body) {
            const newEmail = normEmail(body.email ?? "");
            if (!newEmail)
                return reply.code(400).send({ message: "Email inválido" });
            if (newEmail !== me.email) {
                const exists = await prisma.user.findUnique({ where: { email: newEmail } });
                if (exists)
                    return reply.code(409).send({ message: "Email já está em uso" });
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
    app.patch(`${API_PREFIX}/me/password`, { preHandler: app.auth }, async (req, reply) => {
        const payload = req.user;
        const schema = zod_1.z.object({ password: zod_1.z.string().min(6) });
        const { password } = schema.parse(req.body);
        const me = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!me)
            return reply.code(404).send({ message: "Usuário não encontrado" });
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        await prisma.user.update({
            where: { id: me.id },
            data: { passwordHash },
        });
        return { ok: true };
    });
    app.patch(`${API_PREFIX}/admin/users/:email/profile`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const email = normEmail(req.params.email);
        const schema = zod_1.z.object({
            name: zod_1.z.string().trim().min(2).max(80).optional().nullable(),
        });
        const { name } = schema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "student")
            return reply.code(404).send({ message: "Aluno não encontrado" });
        const clean = (name ?? "").toString().trim();
        const updated = await prisma.user.update({
            where: { email },
            data: { name: clean ? clean : null },
            select: { email: true, name: true },
        });
        return { ok: true, user: updated };
    });
    app.patch(`${API_PREFIX}/admin/users/:email`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const email = normEmail(req.params.email);
        const schema = zod_1.z.object({ active: zod_1.z.boolean() });
        const { active } = schema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "student")
            return reply.code(404).send({ message: "Aluno não encontrado" });
        const updated = await prisma.user.update({ where: { email }, data: { active } });
        return { ok: true, user: { email: updated.email, active: updated.active } };
    });
    app.get(`${API_PREFIX}/admin/users/:email/documents`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const email = normEmail(req.params.email);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "student")
            return reply.code(404).send({ message: "Aluno não encontrado" });
        const docs = await prisma.studentDocument.findMany({ where: { userId: user.id } });
        const out = { training: "", diet: "", supp: "", cardio: "", cardioName: "", cardioTime: "", cardioIntensity: "", cardioDays: "", exams: "", stretch: "" };
        for (const d of docs)
            out[normKey(d.docType)] = d.url;
        return out;
    });
    app.put(`${API_PREFIX}/admin/users/:email/documents`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const email = normEmail(req.params.email);
        const schema = zod_1.z.object({
            training: zod_1.z.string().optional(),
            diet: zod_1.z.string().optional(),
            supp: zod_1.z.string().optional(),
            cardio: zod_1.z.string().optional(),
            cardioName: zod_1.z.string().optional(),
            cardioTime: zod_1.z.string().optional(),
            cardioIntensity: zod_1.z.string().optional(),
            cardioDays: zod_1.z.string().optional(),
            exams: zod_1.z.string().optional(),
            stretch: zod_1.z.string().optional(),
        });
        const body = schema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "student")
            return reply.code(404).send({ message: "Aluno não encontrado" });
        for (const [docTypeRaw, url] of Object.entries(body)) {
            if (typeof url === "undefined")
                continue;
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
            }
            else {
                await prisma.studentDocument.create({
                    data: { userId: user.id, docType, url: clean },
                });
            }
        }
        const docs = await prisma.studentDocument.findMany({ where: { userId: user.id } });
        const out = { training: "", diet: "", supp: "", cardio: "", cardioName: "", cardioTime: "", cardioIntensity: "", cardioDays: "", exams: "", stretch: "" };
        for (const d of docs)
            out[normKey(d.docType)] = d.url;
        return out;
    });
    app.patch(`${API_PREFIX}/admin/users/:email/password`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const email = normEmail(req.params.email);
        const schema = zod_1.z.object({ password: zod_1.z.string().min(6) });
        const { password } = schema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "student")
            return reply.code(404).send({ message: "Aluno não encontrado" });
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        await prisma.user.update({ where: { email }, data: { passwordHash } });
        return { ok: true };
    });
    // ===== ITENS EXTRAS - ADMIN =====
    app.get(`${API_PREFIX}/admin/users/:email/extra-items`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const email = normEmail(req.params.email);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "student")
            return reply.code(404).send({ message: "Aluno não encontrado" });
        const items = await prisma.studentExtraItem.findMany({
            where: { userId: user.id },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        });
        return {
            items: items.map((item) => ({
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
    app.put(`${API_PREFIX}/admin/users/:email/extra-items`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const email = normEmail(req.params.email);
        const schema = zod_1.z.object({
            items: zod_1.z.array(zod_1.z.object({
                title: zod_1.z.string().trim().min(1),
                url: zod_1.z.string().trim().min(1),
                notes: zod_1.z.string().optional().nullable(),
                active: zod_1.z.boolean().optional(),
                order: zod_1.z.number().int().optional(),
                category: zod_1.z.string().optional().nullable(),
                sourceType: zod_1.z.string().optional().nullable(),
            })).default([]),
        });
        const body = schema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "student")
            return reply.code(404).send({ message: "Aluno não encontrado" });
        await prisma.$transaction(async (tx) => {
            await tx.studentExtraItem.deleteMany({ where: { userId: user.id } });
            for (const [idx, item] of body.items.entries()) {
                const title = String(item.title || "").trim();
                const url = String(item.url || "").trim();
                if (!title || !url)
                    continue;
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
        const items = await prisma.studentExtraItem.findMany({
            where: { userId: user.id },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        });
        return { ok: true, items };
    });
    // ===== TREINOS MANUAIS - ALUNO =====
    app.get(`${API_PREFIX}/workouts`, { preHandler: app.auth }, async (req, reply) => {
        const payload = req.user;
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user)
            return reply.code(404).send({ message: "Usuário não encontrado" });
        if (!user.active)
            return reply.code(403).send({ message: "Usuário desativado" });
        const workouts = await prisma.workout.findMany({
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
        const seriesIds = workouts.flatMap((w) => w.exercises.flatMap((we) => we.series.map((s) => s.id)));
        const logs = seriesIds.length
            ? await prisma.studentWorkoutLog.findMany({
                where: { userId: user.id, seriesId: { in: seriesIds } },
                orderBy: { createdAt: "desc" },
            })
            : [];
        const sessions = workouts.length
            ? await prisma.studentWorkoutSession.findMany({
                where: { userId: user.id, workoutId: { in: workouts.map((w) => w.id) }, weekStart: currentWeekStart },
                orderBy: { createdAt: "desc" },
            })
            : [];
        const sessionByWorkout = new Map();
        for (const s of sessions) {
            if (!sessionByWorkout.has(s.workoutId)) {
                sessionByWorkout.set(s.workoutId, { notes: s.notes });
            }
        }
        const lastBySeriesSet = new Map();
        for (const log of logs) {
            const key = `${log.seriesId}:${log.setIndex ?? 0}`;
            if (!lastBySeriesSet.has(key))
                lastBySeriesSet.set(key, log);
        }
        return {
            workouts: workouts.map((w) => ({
                id: w.id,
                title: w.title,
                notes: w.notes || "",
                order: w.order,
                sessionNotes: sessionByWorkout.get(w.id)?.notes || "",
                weekStart: currentWeekStart.toISOString(),
                exercises: w.exercises.map((we) => ({
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
                    series: we.series.map((serie) => {
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
    app.post(`${API_PREFIX}/student/workouts/:workoutId/logs`, { preHandler: app.auth }, async (req, reply) => {
        const payload = req.user;
        const workoutId = String(req.params.workoutId || "");
        const schema = zod_1.z.object({
            notes: zod_1.z.string().trim().max(2000).optional().nullable(),
            logs: zod_1.z.array(zod_1.z.object({
                seriesId: zod_1.z.string().min(1),
                setIndex: zod_1.z.union([zod_1.z.number().int(), zod_1.z.string(), zod_1.z.null()]).optional(),
                weight: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.null()]).optional(),
                performedReps: zod_1.z.union([zod_1.z.number().int(), zod_1.z.string(), zod_1.z.null()]).optional(),
            })).min(1),
        });
        const body = schema.parse(req.body);
        const workout = await prisma.workout.findFirst({ where: { id: workoutId, userId: payload.sub } });
        if (!workout)
            return reply.code(404).send({ message: "Treino não encontrado" });
        const seriesIds = body.logs.map((l) => l.seriesId);
        const validSeries = await prisma.workoutSeries.findMany({
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
        const validById = new Map(validSeries.map((s) => [s.id, s]));
        const validSet = new Set(validSeries.map((s) => s.id));
        const weekStart = startOfWeek();
        // Cada clique em “Salvar execução” precisa virar uma sessão própria.
        // Antes era usado upsert por semana, então salvamentos diferentes ficavam misturados
        // no mesmo histórico e pareciam não ter sido gravados.
        const session = await prisma.studentWorkoutSession.create({
            data: { userId: payload.sub, workoutId, weekStart, notes: body.notes || null },
        });
        const data = body.logs
            .filter((l) => validSet.has(l.seriesId))
            .map((l) => {
            const wRaw = l.weight === "" || l.weight === null || typeof l.weight === "undefined" ? null : Number(l.weight);
            const rRaw = l.performedReps === "" || l.performedReps === null || typeof l.performedReps === "undefined" ? null : Number(l.performedReps);
            const setRaw = l.setIndex === "" || l.setIndex === null || typeof l.setIndex === "undefined" ? 0 : Number(l.setIndex);
            return {
                userId: payload.sub,
                workoutId,
                sessionId: session.id,
                seriesId: l.seriesId,
                setIndex: Number.isFinite(setRaw) && setRaw >= 0 ? Math.trunc(setRaw) : 0,
                weight: Number.isFinite(wRaw) ? wRaw : null,
                performedReps: Number.isFinite(rRaw) ? Math.trunc(rRaw) : null,
                workoutTitle: validById.get(l.seriesId)?.workoutExercise?.workout?.title || workout.title || null,
                exerciseName: validById.get(l.seriesId)?.workoutExercise?.exercise?.name || null,
                muscleGroup: validById.get(l.seriesId)?.workoutExercise?.exercise?.muscleGroup?.name || null,
                targetReps: validById.get(l.seriesId)?.targetReps || null,
            };
        })
            .filter((l) => l.weight !== null || l.performedReps !== null);
        if (!data.length)
            return reply.code(400).send({ message: "Nenhum registro válido para salvar" });
        // Não usar createMany aqui.
        // Em alguns bancos já atualizados, o Prisma/adapter-pg pode gerar ON CONFLICT
        // para createMany. Como removemos a chave única semanal das sessões, isso pode
        // causar: "there is no unique or exclusion constraint matching the ON CONFLICT specification".
        // Criando item por item dentro de transaction, evitamos ON CONFLICT e preservamos
        // cada série da execução como histórico real.
        await prisma.$transaction(data.map((item) => prisma.studentWorkoutLog.create({ data: item })));
        return { ok: true, saved: data.length, sessionId: session.id };
    });
    app.get(`${API_PREFIX}/student/workouts/history`, { preHandler: app.auth }, async (req, reply) => {
        const payload = req.user;
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user)
            return reply.code(404).send({ message: "Usuário não encontrado" });
        if (!user.active)
            return reply.code(403).send({ message: "Usuário desativado" });
        const logs = await prisma.studentWorkoutLog.findMany({
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
        const grouped = new Map();
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
    app.get(`${API_PREFIX}/admin/muscle-groups`, { preHandler: app.auth }, async (req, reply) => {
        const payload = await requireAdmin(req, reply);
        if (!payload)
            return;
        const muscleGroups = await prisma.muscleGroup.findMany({ orderBy: { name: "asc" } });
        return { muscleGroups };
    });
    app.post(`${API_PREFIX}/admin/muscle-groups`, { preHandler: app.auth }, async (req, reply) => {
        const payload = await requireAdmin(req, reply);
        if (!payload)
            return;
        const schema = zod_1.z.object({ name: zod_1.z.string().trim().min(2) });
        const body = schema.parse(req.body || {});
        const muscleGroup = await prisma.muscleGroup.upsert({
            where: { name: body.name },
            update: {},
            create: { name: body.name },
        });
        return { ok: true, muscleGroup };
    });
    app.patch(`${API_PREFIX}/admin/muscle-groups/:id`, { preHandler: app.auth }, async (req, reply) => {
        const payload = await requireAdmin(req, reply);
        if (!payload)
            return;
        const id = String(req.params.id || "");
        const schema = zod_1.z.object({ name: zod_1.z.string().trim().min(2) });
        const body = schema.parse(req.body || {});
        const muscleGroup = await prisma.muscleGroup.update({ where: { id }, data: { name: body.name } });
        return { ok: true, muscleGroup };
    });
    app.delete(`${API_PREFIX}/admin/muscle-groups/:id`, { preHandler: app.auth }, async (req, reply) => {
        const payload = await requireAdmin(req, reply);
        if (!payload)
            return;
        const id = String(req.params.id || "");
        await prisma.exercise.updateMany({ where: { muscleGroupId: id }, data: { muscleGroupId: null } });
        await prisma.muscleGroup.delete({ where: { id } });
        return { ok: true };
    });
    app.get(`${API_PREFIX}/admin/videos`, { preHandler: app.auth }, async (req, reply) => {
        const payload = await requireAdmin(req, reply);
        if (!payload)
            return;
        const videos = await prisma.video.findMany({ orderBy: { title: "asc" } });
        return { videos };
    });
    app.post(`${API_PREFIX}/admin/videos`, { preHandler: app.auth }, async (req, reply) => {
        const payload = await requireAdmin(req, reply);
        if (!payload)
            return;
        const schema = zod_1.z.object({ title: zod_1.z.string().trim().min(2), url: zod_1.z.string().trim().min(3) });
        const body = schema.parse(req.body || {});
        const video = await prisma.video.upsert({
            where: { title: body.title },
            update: { url: body.url },
            create: { title: body.title, url: body.url },
        });
        return { ok: true, video };
    });
    app.patch(`${API_PREFIX}/admin/videos/:id`, { preHandler: app.auth }, async (req, reply) => {
        const payload = await requireAdmin(req, reply);
        if (!payload)
            return;
        const id = String(req.params.id || "");
        const schema = zod_1.z.object({ title: zod_1.z.string().trim().min(2), url: zod_1.z.string().trim().min(3) });
        const body = schema.parse(req.body || {});
        const video = await prisma.video.update({ where: { id }, data: { title: body.title, url: body.url } });
        return { ok: true, video };
    });
    app.delete(`${API_PREFIX}/admin/videos/:id`, { preHandler: app.auth }, async (req, reply) => {
        const payload = await requireAdmin(req, reply);
        if (!payload)
            return;
        const id = String(req.params.id || "");
        await prisma.exercise.updateMany({ where: { videoId: id }, data: { videoId: null } });
        await prisma.video.delete({ where: { id } });
        return { ok: true };
    });
    app.get(`${API_PREFIX}/admin/exercises`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const q = String(req.query?.q || "").trim();
        const exercises = await prisma.exercise.findMany({
            where: q ? { name: { contains: q, mode: "insensitive" } } : {},
            take: 300,
            orderBy: { name: "asc" },
            include: { video: true, muscleGroup: true },
        });
        return { exercises: exercises.map((e) => ({
                id: e.id,
                name: e.name,
                muscleGroup: e.muscleGroup?.name || "",
                videoUrl: e.video?.url || "",
                videoTitle: e.video?.title || "",
            })) };
    });
    app.post(`${API_PREFIX}/admin/exercises`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const schema = zod_1.z.object({
            name: zod_1.z.string().trim().min(2),
            muscleGroup: zod_1.z.string().trim().optional().nullable(),
            videoUrl: zod_1.z.string().trim().optional().nullable(),
            videoTitle: zod_1.z.string().trim().optional().nullable(),
        });
        const body = schema.parse(req.body);
        const exercise = await upsertExercise(body.name, body.muscleGroup || "", body.videoUrl || "", body.videoTitle || body.name);
        return { ok: true, exercise };
    });
    app.patch(`${API_PREFIX}/admin/exercises/:id`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const id = String(req.params.id || "");
        const schema = zod_1.z.object({
            name: zod_1.z.string().trim().min(2),
            muscleGroup: zod_1.z.string().trim().optional().nullable(),
            videoUrl: zod_1.z.string().trim().optional().nullable(),
            videoTitle: zod_1.z.string().trim().optional().nullable(),
        });
        const body = schema.parse(req.body || {});
        let muscleGroupId = null;
        const muscleName = String(body.muscleGroup || "").trim();
        if (muscleName) {
            const mg = await prisma.muscleGroup.upsert({
                where: { name: muscleName },
                update: {},
                create: { name: muscleName },
            });
            muscleGroupId = mg.id;
        }
        let videoId = null;
        const videoUrl = String(body.videoUrl || "").trim();
        if (videoUrl) {
            const title = String(body.videoTitle || body.name).trim() || body.name;
            const video = await prisma.video.upsert({
                where: { title },
                update: { url: videoUrl },
                create: { title, url: videoUrl },
            });
            videoId = video.id;
        }
        const exercise = await prisma.exercise.update({ where: { id }, data: { name: body.name, muscleGroupId, videoId } });
        return { ok: true, exercise };
    });
    app.delete(`${API_PREFIX}/admin/exercises/:id`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const id = String(req.params.id || "");
        const used = await prisma.workoutExercise.count({ where: { exerciseId: id } });
        if (used > 0) {
            return reply.code(409).send({ message: "Este exercício já está vinculado a treino. Remova dos treinos antes de excluir." });
        }
        await prisma.exercise.delete({ where: { id } });
        return { ok: true };
    });
    // ===== TÉCNICAS DE TREINO - ADMIN =====
    app.get(`${API_PREFIX}/admin/techniques`, { preHandler: app.auth }, async (req, reply) => {
        const payload = await requireAdmin(req, reply);
        if (!payload)
            return;
        const techniques = await prisma.trainingTechnique.findMany({ orderBy: { name: "asc" } });
        return { techniques };
    });
    app.post(`${API_PREFIX}/admin/techniques`, { preHandler: app.auth }, async (req, reply) => {
        const payload = await requireAdmin(req, reply);
        if (!payload)
            return;
        const schema = zod_1.z.object({
            name: zod_1.z.string().trim().min(2, "Informe o nome da técnica"),
            videoUrl: zod_1.z.string().trim().optional().nullable(),
            notes: zod_1.z.string().trim().optional().nullable(),
        });
        const body = schema.parse(req.body || {});
        const technique = await prisma.trainingTechnique.upsert({
            where: { name: body.name },
            update: { videoUrl: body.videoUrl || null, notes: body.notes || null },
            create: { name: body.name, videoUrl: body.videoUrl || null, notes: body.notes || null },
        });
        return { ok: true, technique };
    });
    app.patch(`${API_PREFIX}/admin/techniques/:id`, { preHandler: app.auth }, async (req, reply) => {
        const payload = await requireAdmin(req, reply);
        if (!payload)
            return;
        const id = String(req.params.id || "");
        const schema = zod_1.z.object({
            name: zod_1.z.string().trim().min(2, "Informe o nome da técnica"),
            videoUrl: zod_1.z.string().trim().optional().nullable(),
            notes: zod_1.z.string().trim().optional().nullable(),
        });
        const body = schema.parse(req.body || {});
        const technique = await prisma.trainingTechnique.update({
            where: { id },
            data: { name: body.name, videoUrl: body.videoUrl || null, notes: body.notes || null },
        });
        await prisma.workoutExercise.updateMany({
            where: { techniqueId: id },
            data: {
                techniqueName: technique.name,
                techniqueVideoUrl: technique.videoUrl,
                techniqueNotes: technique.notes,
            },
        });
        return { ok: true, technique };
    });
    app.delete(`${API_PREFIX}/admin/techniques/:id`, { preHandler: app.auth }, async (req, reply) => {
        const payload = await requireAdmin(req, reply);
        if (!payload)
            return;
        const id = String(req.params.id || "");
        await prisma.workoutExercise.updateMany({
            where: { techniqueId: id },
            data: {
                techniqueId: null,
                techniqueName: null,
                techniqueVideoUrl: null,
                techniqueNotes: null,
                techniqueNote: null,
            },
        });
        await prisma.trainingTechnique.delete({ where: { id } });
        return { ok: true };
    });
    async function upsertExercise(nameRaw, muscleRaw = "", videoUrlRaw = "", videoTitleRaw = "") {
        const name = String(nameRaw || "").trim();
        const muscleName = String(muscleRaw || "").trim();
        const videoUrl = String(videoUrlRaw || "").trim();
        const videoTitle = String(videoTitleRaw || name).trim() || name;
        let muscleGroupId = null;
        if (muscleName) {
            const mg = await prisma.muscleGroup.upsert({
                where: { name: muscleName },
                update: {},
                create: { name: muscleName },
            });
            muscleGroupId = mg.id;
        }
        let videoId = null;
        if (videoUrl) {
            const video = await prisma.video.upsert({
                where: { title: videoTitle },
                update: { url: videoUrl },
                create: { title: videoTitle, url: videoUrl },
            });
            videoId = video.id;
        }
        const existing = await prisma.exercise.findFirst({ where: { name, muscleGroupId } });
        if (existing) {
            return prisma.exercise.update({ where: { id: existing.id }, data: { videoId } });
        }
        return prisma.exercise.create({ data: { name, muscleGroupId, videoId } });
    }
    const workoutInputSchema = zod_1.z.object({
        title: zod_1.z.string().trim().min(1),
        notes: zod_1.z.string().optional().nullable(),
        active: zod_1.z.boolean().optional(),
        order: zod_1.z.number().int().optional(),
        exercises: zod_1.z.array(zod_1.z.object({
            exerciseId: zod_1.z.string().optional().nullable(),
            name: zod_1.z.string().trim().min(2),
            muscleGroup: zod_1.z.string().optional().nullable(),
            videoUrl: zod_1.z.string().optional().nullable(),
            videoTitle: zod_1.z.string().optional().nullable(),
            notes: zod_1.z.string().optional().nullable(),
            techniqueId: zod_1.z.string().optional().nullable(),
            techniqueName: zod_1.z.string().optional().nullable(),
            techniqueVideoUrl: zod_1.z.string().optional().nullable(),
            techniqueNotes: zod_1.z.string().optional().nullable(),
            techniqueNote: zod_1.z.string().optional().nullable(),
            order: zod_1.z.number().int().optional(),
            series: zod_1.z.array(zod_1.z.object({
                count: zod_1.z.number().int().min(1).optional(),
                reps: zod_1.z.string().trim().optional().nullable(),
                targetReps: zod_1.z.string().trim().min(1),
                order: zod_1.z.number().int().optional(),
            })).min(1),
        })).min(1),
    });
    app.get(`${API_PREFIX}/admin/users/:email/workouts`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const email = normEmail(req.params.email);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "student")
            return reply.code(404).send({ message: "Aluno não encontrado" });
        const workouts = await prisma.workout.findMany({
            where: { userId: user.id },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            include: {
                exercises: {
                    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
                    include: { exercise: { include: { video: true, muscleGroup: true } }, series: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } },
                },
            },
        });
        return { workouts: workouts.map((w) => ({
                id: w.id,
                title: w.title,
                notes: w.notes || "",
                active: w.active,
                order: w.order,
                exercises: w.exercises.map((we) => ({
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
                    series: we.series.map((s) => ({ id: s.id, count: s.count || 1, reps: s.targetReps, targetReps: s.targetReps, order: s.order })),
                })),
            })) };
    });
    app.put(`${API_PREFIX}/admin/users/:email/workouts`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const email = normEmail(req.params.email);
        const schema = zod_1.z.object({ workouts: zod_1.z.array(workoutInputSchema).default([]) });
        const body = schema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "student")
            return reply.code(404).send({ message: "Aluno não encontrado" });
        await prisma.$transaction(async (tx) => {
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
    app.get(`${API_PREFIX}/admin/workout-records`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const email = normEmail(String(req.query?.email || ""));
        const from = parseDateParam(req.query?.from);
        const to = parseDateParam(req.query?.to);
        const where = {};
        if (email) {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user || user.role !== "student")
                return reply.code(404).send({ message: "Aluno não encontrado" });
            where.userId = user.id;
        }
        if (from || to) {
            where.createdAt = {};
            if (from)
                where.createdAt.gte = from;
            if (to)
                where.createdAt.lte = to;
        }
        const logs = await prisma.studentWorkoutLog.findMany({
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
        const grouped = new Map();
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
    app.delete(`${API_PREFIX}/admin/users/:email`, { preHandler: app.auth }, async (req, reply) => {
        if (!requireAdmin(req, reply))
            return;
        const email = normEmail(req.params.email);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "student")
            return reply.code(404).send({ message: "Aluno não encontrado" });
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
