import { activityRouter } from "~/server/api/routers/activityRouter";
import { announcementRouter } from "~/server/api/routers/announcementRouter";
import { categoryRouter } from "~/server/api/routers/categoryRouter";
import { courseRouter } from "~/server/api/routers/courseRouter";
import { enrollmentRouter } from "~/server/api/routers/enrollmentRouter";
import { fileRouter } from "~/server/api/routers/fileRouter";
import { gradebookRouter } from "~/server/api/routers/gradebookRouter";
import { lessonRouter } from "~/server/api/routers/lessonRouter";
import { messageRouter } from "~/server/api/routers/messageRouter";
import { notificationRouter } from "~/server/api/routers/notificationRouter";
import { pageRouter } from "~/server/api/routers/pageRouter";
import { postRouter } from "~/server/api/routers/post";
import { progressRouter } from "~/server/api/routers/progressRouter";
import { quizRouter } from "~/server/api/routers/quizRouter";
import { sectionRouter } from "~/server/api/routers/sectionRouter";
import { textMediaRouter } from "~/server/api/routers/textMediaRouter";
import { urlRouter } from "~/server/api/routers/urlRouter";
import { userRouter } from "~/server/api/routers/userRouter";
import { wikiRouter } from "~/server/api/routers/wikiRouter";
import { workshopRouter } from "~/server/api/routers/workshopRouter";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  post: postRouter,
  user: userRouter,
  category: categoryRouter,
  course: courseRouter,
  section: sectionRouter,
  activity: activityRouter,
  enrollment: enrollmentRouter,
  progress: progressRouter,
  gradebook: gradebookRouter,
  announcement: announcementRouter,
  message: messageRouter,
  notification: notificationRouter,
  file: fileRouter,
  quiz: quizRouter,
  lesson: lessonRouter,
  page: pageRouter,
  textMedia: textMediaRouter,
  url: urlRouter,
  wiki: wikiRouter,
  workshop: workshopRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
