ALTER TABLE "pg-drizzle_message_thread" DROP CONSTRAINT "pg-drizzle_message_thread_courseId_pg-drizzle_course_id_fk";
--> statement-breakpoint
ALTER TABLE "pg-drizzle_quiz_answer" DROP CONSTRAINT "pg-drizzle_quiz_answer_questionId_pg-drizzle_quiz_question_id_fk";
--> statement-breakpoint
ALTER TABLE "pg-drizzle_quiz_attempt" DROP CONSTRAINT "pg-drizzle_quiz_attempt_quizActivityId_pg-drizzle_activity_id_fk";
--> statement-breakpoint
ALTER TABLE "pg-drizzle_workshop_submission" DROP CONSTRAINT "pg-drizzle_workshop_submission_workshopActivityId_pg-drizzle_activity_id_fk";
--> statement-breakpoint
ALTER TABLE "pg-drizzle_message_thread" ADD CONSTRAINT "pg-drizzle_message_thread_courseId_pg-drizzle_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "public"."pg-drizzle_course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_quiz_answer" ADD CONSTRAINT "pg-drizzle_quiz_answer_questionId_pg-drizzle_quiz_question_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."pg-drizzle_quiz_question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_quiz_attempt" ADD CONSTRAINT "pg-drizzle_quiz_attempt_quizActivityId_pg-drizzle_activity_id_fk" FOREIGN KEY ("quizActivityId") REFERENCES "public"."pg-drizzle_activity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_workshop_submission" ADD CONSTRAINT "pg-drizzle_workshop_submission_workshopActivityId_pg-drizzle_activity_id_fk" FOREIGN KEY ("workshopActivityId") REFERENCES "public"."pg-drizzle_activity"("id") ON DELETE cascade ON UPDATE no action;