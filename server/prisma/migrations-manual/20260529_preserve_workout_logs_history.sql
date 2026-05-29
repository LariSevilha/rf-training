-- Preserva o histórico de cargas/reps mesmo quando o treino é editado/recriado no admin.
-- Rode este SQL no banco de produção antes/depois de subir o novo backend.

ALTER TABLE "StudentWorkoutLog"
  ADD COLUMN IF NOT EXISTS "workoutTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "exerciseName" TEXT,
  ADD COLUMN IF NOT EXISTS "muscleGroup" TEXT,
  ADD COLUMN IF NOT EXISTS "targetReps" TEXT;

ALTER TABLE "StudentWorkoutLog" ALTER COLUMN "seriesId" DROP NOT NULL;

ALTER TABLE "StudentWorkoutLog" DROP CONSTRAINT IF EXISTS "StudentWorkoutLog_seriesId_fkey";
ALTER TABLE "StudentWorkoutLog"
  ADD CONSTRAINT "StudentWorkoutLog_seriesId_fkey"
  FOREIGN KEY ("seriesId") REFERENCES "WorkoutSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentWorkoutLog" DROP CONSTRAINT IF EXISTS "StudentWorkoutLog_sessionId_fkey";
ALTER TABLE "StudentWorkoutLog"
  ADD CONSTRAINT "StudentWorkoutLog_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "StudentWorkoutSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Índices para histórico do aluno/admin ficar rápido.
CREATE INDEX IF NOT EXISTS "StudentWorkoutLog_userId_createdAt_idx"
  ON "StudentWorkoutLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "StudentWorkoutLog_sessionId_idx"
  ON "StudentWorkoutLog"("sessionId");
