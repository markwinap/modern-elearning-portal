import { activityRouter } from "~/server/api/routers/activityRouter";
import { announcementRouter } from "~/server/api/routers/announcementRouter";
import { auditRouter } from "~/server/api/routers/auditRouter";
import { categoryRouter } from "~/server/api/routers/categoryRouter";
import { certificateRouter } from "~/server/api/routers/certificateRouter";
import { learningPathRouter } from "~/server/api/routers/learningPathRouter";
import { skillRouter } from "~/server/api/routers/skillRouter";
import { courseRouter } from "~/server/api/routers/courseRouter";
import { dashboardRouter } from "~/server/api/routers/dashboardRouter";
import { enrollmentRouter } from "~/server/api/routers/enrollmentRouter";
import { fileRouter } from "~/server/api/routers/fileRouter";
import { gamificationRouter } from "~/server/api/routers/gamificationRouter";
import { gradebookRouter } from "~/server/api/routers/gradebookRouter";
import { lessonRouter } from "~/server/api/routers/lessonRouter";
import { messageRouter } from "~/server/api/routers/messageRouter";
import { notificationRouter } from "~/server/api/routers/notificationRouter";
import { pageRouter } from "~/server/api/routers/pageRouter";
import { progressRouter } from "~/server/api/routers/progressRouter";
import { questionBankRouter } from "~/server/api/routers/questionBankRouter";
import { quizRouter } from "~/server/api/routers/quizRouter";
import { searchRouter } from "~/server/api/routers/searchRouter";
import { sectionRouter } from "~/server/api/routers/sectionRouter";
import { settingsRouter } from "~/server/api/routers/settingsRouter";
import { textMediaRouter } from "~/server/api/routers/textMediaRouter";
import { urlRouter } from "~/server/api/routers/urlRouter";
import { userRouter } from "~/server/api/routers/userRouter";
import { wikiRouter } from "~/server/api/routers/wikiRouter";
import { workshopRouter } from "~/server/api/routers/workshopRouter";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  user: userRouter,
  audit: auditRouter,
  category: categoryRouter,
  certificate: certificateRouter,
  skill: skillRouter,
  learningPath: learningPathRouter,
  course: courseRouter,
  dashboard: dashboardRouter,
  section: sectionRouter,
  settings: settingsRouter,
  activity: activityRouter,
  enrollment: enrollmentRouter,
  gamification: gamificationRouter,
  progress: progressRouter,
  questionBank: questionBankRouter,
  gradebook: gradebookRouter,
  announcement: announcementRouter,
  message: messageRouter,
  notification: notificationRouter,
  file: fileRouter,
  quiz: quizRouter,
  lesson: lessonRouter,
  page: pageRouter,
  search: searchRouter,
  textMedia: textMediaRouter,
  url: urlRouter,
  wiki: wikiRouter,
  workshop: workshopRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
