CREATE TABLE IF NOT EXISTS "TrainingTechnique" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "videoUrl" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "StudentExtraItem" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentExtraItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "WorkoutExercise" ADD COLUMN IF NOT EXISTS "techniqueId" TEXT;
ALTER TABLE "WorkoutExercise" ADD COLUMN IF NOT EXISTS "techniqueNote" TEXT;

DO $$ BEGIN
  ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_techniqueId_fkey"
  FOREIGN KEY ("techniqueId") REFERENCES "TrainingTechnique"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "StudentExtraItem_userId_order_idx" ON "StudentExtraItem" ("userId", "order");
CREATE INDEX IF NOT EXISTS "WorkoutExercise_techniqueId_idx" ON "WorkoutExercise" ("techniqueId");
