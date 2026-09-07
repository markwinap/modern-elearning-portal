import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  getContinueLearning,
  getRecentAnnouncements,
  getUpcomingDeadlines,
} from "~/server/lib/dashboard";
import { getRecommendations } from "~/server/lib/recommendations";

export const dashboardRouter = createTRPCRouter({
  getLearnerHome: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [continueLearning, upcomingDeadlines, announcements, recommendations] =
      await Promise.all([
        getContinueLearning(ctx.db, userId),
        getUpcomingDeadlines(ctx.db, userId),
        getRecentAnnouncements(ctx.db, userId),
        getRecommendations(ctx.db, userId, 5),
      ]);

    return {
      continueLearning,
      upcomingDeadlines,
      announcements,
      recommendations,
    };
  }),
});
