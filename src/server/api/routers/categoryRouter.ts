import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { categories } from "~/server/db/schema";

export const categoryRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(categories).orderBy(categories.name);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [cat] = await ctx.db
        .select()
        .from(categories)
        .where(eq(categories.id, input.id))
        .limit(1);
      if (!cat) throw new TRPCError({ code: "NOT_FOUND" });
      return cat;
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(128),
        description: z.string().optional(),
        parentId: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
      const [cat] = await ctx.db
        .insert(categories)
        .values({ name: input.name, slug, description: input.description, parentId: input.parentId })
        .returning();
      return cat;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(128).optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await ctx.db.update(categories).set(data).where(eq(categories.id, id));
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(categories).where(eq(categories.id, input.id));
    }),
});
