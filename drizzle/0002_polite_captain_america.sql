CREATE TYPE "public"."user_role" AS ENUM('student', 'teacher', 'admin');--> statement-breakpoint
ALTER TABLE "pg-drizzle_enrollment" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "pg-drizzle_enrollment" ALTER COLUMN "role" SET DEFAULT 'student'::text;--> statement-breakpoint
DROP TYPE "public"."enrollment_role";--> statement-breakpoint
CREATE TYPE "public"."enrollment_role" AS ENUM('student', 'teacher');--> statement-breakpoint
ALTER TABLE "pg-drizzle_enrollment" ALTER COLUMN "role" SET DEFAULT 'student'::"public"."enrollment_role";--> statement-breakpoint
ALTER TABLE "pg-drizzle_enrollment" ALTER COLUMN "role" SET DATA TYPE "public"."enrollment_role" USING "role"::"public"."enrollment_role";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'student'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET NOT NULL;