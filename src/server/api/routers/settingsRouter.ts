import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { platformSettings } from "~/server/db/schema";

const settingsInputSchema = z.object({
  platformName: z.string().min(1).max(128),
  supportEmail: z.string().email(),
  defaultCourseCapacity: z.number().int().min(1).max(100_000),
  defaultEnrollmentMode: z.enum(["open", "approval"]),
  digestFrequency: z.enum(["off", "daily", "weekly"]),
  sendSystemAnnouncements: z.boolean(),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().min(1).max(4_000),
});

const defaultSettings = {
  platformName: "Modern E-Learning Portal",
  supportEmail: "support@modern-elearning-portal.local",
  defaultCourseCapacity: 100,
  defaultEnrollmentMode: "open" as const,
  digestFrequency: "daily" as const,
  sendSystemAnnouncements: true,
  maintenanceMode: false,
  maintenanceMessage:
    "Platform maintenance is in progress. Please check back shortly.",
};

export const settingsRouter = createTRPCRouter({
  get: adminProcedure.query(async ({ ctx }) => {
    const [settings] = await ctx.db
      .select()
      .from(platformSettings)
      .orderBy(desc(platformSettings.id))
      .limit(1);

    return settings ?? defaultSettings;
  }),

  update: adminProcedure
    .input(settingsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: platformSettings.id })
        .from(platformSettings)
        .orderBy(desc(platformSettings.id))
        .limit(1);

      if (existing) {
        const [updated] = await ctx.db
          .update(platformSettings)
          .set(input)
          .where(eq(platformSettings.id, existing.id))
          .returning();

        return updated ?? { ...defaultSettings, ...input };
      }

      const [created] = await ctx.db
        .insert(platformSettings)
        .values(input)
        .returning();
      return created ?? { ...defaultSettings, ...input };
    }),
});
