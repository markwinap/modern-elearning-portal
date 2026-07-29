CREATE TYPE "public"."section_duration_mode" AS ENUM('manual', 'auto');--> statement-breakpoint
ALTER TABLE "pg-drizzle_course_section" ADD COLUMN "durationMins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pg-drizzle_course_section" ADD COLUMN "duration_mode" "section_duration_mode" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "pg-drizzle_course_section" ADD COLUMN "pickCount" integer;--> statement-breakpoint
ALTER TABLE "pg-drizzle_quiz_answer" ADD COLUMN "timeSpentSecs" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pg-drizzle_quiz_question" ADD COLUMN "recommendedTimeMins" integer DEFAULT 1 NOT NULL;