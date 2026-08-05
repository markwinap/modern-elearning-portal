DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_feedback_mode') THEN
    CREATE TYPE "public"."quiz_feedback_mode" AS ENUM('immediate', 'after_last_attempt', 'after_due_date', 'never');
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "pg-drizzle_quiz_attempt" ADD COLUMN IF NOT EXISTS "questionIds" jsonb;--> statement-breakpoint
ALTER TABLE "pg-drizzle_quiz" ADD COLUMN IF NOT EXISTS "questionsPerAttempt" integer;--> statement-breakpoint
ALTER TABLE "pg-drizzle_quiz" ADD COLUMN IF NOT EXISTS "oneQuestionAtATime" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pg-drizzle_quiz" ADD COLUMN IF NOT EXISTS "feedback_mode" "quiz_feedback_mode" DEFAULT 'immediate' NOT NULL;--> statement-breakpoint
ALTER TABLE "pg-drizzle_quiz" ADD COLUMN IF NOT EXISTS "availableUntil" timestamp with time zone;