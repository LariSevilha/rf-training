-- RF Training deploy seguro: migração aditiva para sair da versão PDF-only para versão com treinos manuais/biblioteca.
-- Não remove tabelas nem colunas existentes.
-- Pode rodar mais de uma vez por causa de IF NOT EXISTS/DO blocks.

-- 1) Tabelas de biblioteca
CREATE TABLE IF NOT EXISTS "MuscleGroup" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Video" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL UNIQUE,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Exercise" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "muscleGroupId" TEXT,
  "videoId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Exercise_muscleGroupId_fkey" FOREIGN KEY ("muscleGroupId") REFERENCES "MuscleGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Exercise_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Exercise_name_muscleGroupId_key" ON "Exercise" ("name", "muscleGroupId");

CREATE TABLE IF NOT EXISTS "TrainingTechnique" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "videoUrl" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2) Treinos manuais
CREATE TABLE IF NOT EXISTS "Workout" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "WorkoutExercise" (
  "id" TEXT PRIMARY KEY,
  "workoutId" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "techniqueId" TEXT,
  "notes" TEXT,
  "techniqueName" TEXT,
  "techniqueVideoUrl" TEXT,
  "techniqueNotes" TEXT,
  "techniqueNote" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkoutExercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WorkoutExercise_techniqueId_fkey" FOREIGN KEY ("techniqueId") REFERENCES "TrainingTechnique"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "WorkoutExercise_techniqueId_idx" ON "WorkoutExercise" ("techniqueId");

CREATE TABLE IF NOT EXISTS "WorkoutSeries" (
  "id" TEXT PRIMARY KEY,
  "workoutExerciseId" TEXT NOT NULL,
  "targetReps" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkoutSeries_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "StudentWorkoutSession" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "workoutId" TEXT NOT NULL,
  "notes" TEXT,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentWorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StudentWorkoutSession_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentWorkoutSession_userId_workoutId_weekStart_key"
ON "StudentWorkoutSession" ("userId", "workoutId", "weekStart");

CREATE TABLE IF NOT EXISTS "StudentWorkoutLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "workoutId" TEXT,
  "seriesId" TEXT NOT NULL,
  "sessionId" TEXT,
  "setIndex" INTEGER NOT NULL DEFAULT 0,
  "weight" DOUBLE PRECISION,
  "performedReps" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentWorkoutLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StudentWorkoutLog_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "StudentWorkoutLog_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "WorkoutSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StudentWorkoutLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudentWorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3) Itens extras
CREATE TABLE IF NOT EXISTS "StudentExtraItem" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'outros',
  "sourceType" TEXT NOT NULL DEFAULT 'link',
  "url" TEXT NOT NULL,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentExtraItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudentExtraItem_userId_order_idx" ON "StudentExtraItem" ("userId", "order");

-- 4) Garantias para ambientes que já tinham parte das tabelas
ALTER TABLE "WorkoutSeries" ADD COLUMN IF NOT EXISTS "count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "StudentWorkoutLog" ADD COLUMN IF NOT EXISTS "setIndex" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "WorkoutExercise" ADD COLUMN IF NOT EXISTS "techniqueId" TEXT;
ALTER TABLE "WorkoutExercise" ADD COLUMN IF NOT EXISTS "techniqueName" TEXT;
ALTER TABLE "WorkoutExercise" ADD COLUMN IF NOT EXISTS "techniqueVideoUrl" TEXT;
ALTER TABLE "WorkoutExercise" ADD COLUMN IF NOT EXISTS "techniqueNotes" TEXT;
ALTER TABLE "WorkoutExercise" ADD COLUMN IF NOT EXISTS "techniqueNote" TEXT;

ALTER TABLE "StudentExtraItem" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'outros';
ALTER TABLE "StudentExtraItem" ADD COLUMN IF NOT EXISTS "sourceType" TEXT NOT NULL DEFAULT 'link';
