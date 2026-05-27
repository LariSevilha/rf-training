ALTER TABLE "WorkoutExercise" ADD COLUMN IF NOT EXISTS "techniqueId" TEXT;
ALTER TABLE "WorkoutExercise" ADD COLUMN IF NOT EXISTS "techniqueName" TEXT;
ALTER TABLE "WorkoutExercise" ADD COLUMN IF NOT EXISTS "techniqueVideoUrl" TEXT;
ALTER TABLE "WorkoutExercise" ADD COLUMN IF NOT EXISTS "techniqueNotes" TEXT;
ALTER TABLE "WorkoutExercise" ADD COLUMN IF NOT EXISTS "techniqueNote" TEXT;
