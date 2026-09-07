import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { search } from "~/server/lib/search";

const searchInputSchema = z.object({
  query: z.string().min(1).max(200),
  types: z
    .array(z.enum(["course", "activity", "discussion", "wiki"]))
    .optional(),
  categoryId: z.number().int().optional(),
  instructorId: z.string().min(1).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(10),
});

export const searchRouter = createTRPCRouter({
  search: protectedProcedure
    .input(searchInputSchema)
    .query(async ({ ctx, input }) => {
      return search(ctx.db, input);
    }),
});
