import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  activities,
  activitySkills,
  courseSections,
  courseSkills,
  courses,
  skillCategories,
  skills,
  userSkills,
} from "~/server/db/schema";

const skillSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().optional(),
  categoryId: z.number().int().nullable().optional(),
});

const categorySchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().optional(),
  parentId: z.number().int().nullable().optional(),
});

const mapCourseSkillsSchema = z.object({
  courseId: z.number().int(),
  skillIds: z.array(z.number().int()),
});

export const skillRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(skills).orderBy(asc(skills.name));
  }),

  listCategories: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(skillCategories)
      .orderBy(asc(skillCategories.name));
  }),

  create: adminProcedure.input(skillSchema).mutation(async ({ ctx, input }) => {
    const [skill] = await ctx.db.insert(skills).values(input).returning();
    if (!skill) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return skill;
  }),

  update: adminProcedure
    .input(skillSchema.extend({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [skill] = await ctx.db
        .update(skills)
        .set(data)
        .where(eq(skills.id, id))
        .returning();
      if (!skill) throw new TRPCError({ code: "NOT_FOUND" });
      return skill;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(skills).where(eq(skills.id, input.id));
    }),

  createCategory: adminProcedure
    .input(categorySchema)
    .mutation(async ({ ctx, input }) => {
      const [category] = await ctx.db
        .insert(skillCategories)
        .values(input)
        .returning();
      if (!category) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return category;
    }),

  deleteCategory: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(skillCategories)
        .where(eq(skillCategories.id, input.id));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [skill] = await ctx.db
        .select()
        .from(skills)
        .where(eq(skills.id, input.id))
        .limit(1);
      if (!skill) throw new TRPCError({ code: "NOT_FOUND" });
      return skill;
    }),

  listWithCategories: protectedProcedure.query(async ({ ctx }) => {
    const allSkills = await ctx.db
      .select()
      .from(skills)
      .orderBy(asc(skills.name));
    const categories = await ctx.db
      .select()
      .from(skillCategories)
      .orderBy(asc(skillCategories.name));
    return { skills: allSkills, categories };
  }),

  mapToCourse: adminProcedure
    .input(mapCourseSkillsSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(courseSkills)
        .where(eq(courseSkills.courseId, input.courseId));
      if (input.skillIds.length === 0)
        return { courseId: input.courseId, skillIds: [] as number[] };
      const existing = await ctx.db
        .select({ id: skills.id })
        .from(skills)
        .where(inArray(skills.id, input.skillIds));
      const validIds = existing.map((s) => s.id);
      if (validIds.length > 0) {
        await ctx.db
          .insert(courseSkills)
          .values(
            validIds.map((skillId) => ({ courseId: input.courseId, skillId })),
          );
      }
      return { courseId: input.courseId, skillIds: validIds };
    }),

  getCourseSkills: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          skillId: skills.id,
          name: skills.name,
          description: skills.description,
          categoryId: skills.categoryId,
        })
        .from(skills)
        .innerJoin(courseSkills, eq(courseSkills.skillId, skills.id))
        .where(eq(courseSkills.courseId, input.courseId));
    }),

  getCourseActivitySkills: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          activityId: activities.id,
          activityTitle: activities.title,
          skillId: skills.id,
          skillName: skills.name,
        })
        .from(activities)
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .innerJoin(courses, eq(courseSections.courseId, courses.id))
        .innerJoin(activitySkills, eq(activitySkills.activityId, activities.id))
        .innerJoin(skills, eq(activitySkills.skillId, skills.id))
        .where(eq(courses.id, input.courseId));
    }),

  getMySkillProfile: protectedProcedure.query(async ({ ctx }) => {
    const skillRows = await ctx.db
      .select({
        skillId: skills.id,
        skillName: skills.name,
        description: skills.description,
        categoryId: skills.categoryId,
        score: userSkills.score,
        attainedAt: userSkills.attainedAt,
      })
      .from(skills)
      .leftJoin(
        userSkills,
        and(
          eq(userSkills.skillId, skills.id),
          eq(userSkills.userId, ctx.session.user.id),
        ),
      )
      .orderBy(asc(skills.name));
    const categories = await ctx.db
      .select()
      .from(skillCategories)
      .orderBy(asc(skillCategories.name));
    return { skills: skillRows, categories };
  }),
});
