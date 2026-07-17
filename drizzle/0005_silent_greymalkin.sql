ALTER TABLE "pg-drizzle_grade" DROP CONSTRAINT "pg-drizzle_grade_gradeCategoryId_pg-drizzle_grade_category_id_fk";
--> statement-breakpoint
ALTER TABLE "pg-drizzle_activity" ADD COLUMN "gradeCategoryId" integer;--> statement-breakpoint
ALTER TABLE "pg-drizzle_activity" ADD COLUMN "gradable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "pg-drizzle_course_section" ADD COLUMN "gradable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "pg-drizzle_grade" ADD COLUMN "isAutoGraded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pg-drizzle_activity" ADD CONSTRAINT "pg-drizzle_activity_gradeCategoryId_pg-drizzle_grade_category_id_fk" FOREIGN KEY ("gradeCategoryId") REFERENCES "public"."pg-drizzle_grade_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_grade" ADD CONSTRAINT "pg-drizzle_grade_gradeCategoryId_pg-drizzle_grade_category_id_fk" FOREIGN KEY ("gradeCategoryId") REFERENCES "public"."pg-drizzle_grade_category"("id") ON DELETE set null ON UPDATE no action;