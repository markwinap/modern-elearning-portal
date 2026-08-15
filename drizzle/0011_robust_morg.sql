ALTER TYPE "public"."enrollment_status" ADD VALUE 'pending';--> statement-breakpoint
ALTER TYPE "public"."enrollment_status" ADD VALUE 'rejected';--> statement-breakpoint
ALTER TABLE "pg-drizzle_enrollment" ADD COLUMN "reviewedBy" text;--> statement-breakpoint
ALTER TABLE "pg-drizzle_enrollment" ADD COLUMN "reviewedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pg-drizzle_enrollment" ADD COLUMN "rejectionReason" text;--> statement-breakpoint
ALTER TABLE "pg-drizzle_enrollment" ADD CONSTRAINT "pg-drizzle_enrollment_reviewedBy_user_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;