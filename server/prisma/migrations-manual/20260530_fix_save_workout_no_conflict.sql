-- Corrige estrutura necessária para salvar execuções de treino sem erro de ON CONFLICT.
-- Seguro para rodar mais de uma vez.

ALTER TABLE "StudentWorkoutLog"
  ADD COLUMN IF NOT EXISTS "workoutTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "exerciseName" TEXT,
  ADD COLUMN IF NOT EXISTS "muscleGroup" TEXT,
  ADD COLUMN IF NOT EXISTS "targetReps" TEXT;

ALTER TABLE "StudentWorkoutLog" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
ALTER TABLE "StudentWorkoutLog" ADD COLUMN IF NOT EXISTS "setIndex" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentDocument_userId_docType_key" ON "StudentDocument" ("userId", "docType");
CREATE UNIQUE INDEX IF NOT EXISTS "MuscleGroup_name_key" ON "MuscleGroup" ("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Video_title_key" ON "Video" ("title");
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingTechnique_name_key" ON "TrainingTechnique" ("name");

-- Não criar UNIQUE em StudentWorkoutSession(userId,workoutId,weekStart),
-- para permitir múltiplas execuções do mesmo treino na mesma semana.
CREATE INDEX IF NOT EXISTS "StudentWorkoutSession_userId_workoutId_weekStart_idx"
ON "StudentWorkoutSession" ("userId", "workoutId", "weekStart");

CREATE INDEX IF NOT EXISTS "StudentWorkoutLog_sessionId_idx" ON "StudentWorkoutLog" ("sessionId");
CREATE INDEX IF NOT EXISTS "StudentWorkoutLog_userId_createdAt_idx" ON "StudentWorkoutLog" ("userId", "createdAt");
