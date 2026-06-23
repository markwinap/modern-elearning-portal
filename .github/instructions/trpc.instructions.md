---
applyTo: "src/server/api/**/*.ts,src/trpc/**/*.ts"
---

# tRPC v11 Rules

## Router Structure

Every router file exports a single `createTRPCRouter()`. Routers are composed in `src/server/api/root.ts`.

```typescript
// src/server/api/routers/user.ts
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { users } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";

export const userRouter = createTRPCRouter({
  // Public: anyone can call
  getPublicProfile: publicProcedure
    .input(z.object({ id: z.string() })) // better-auth user.id is text, not UUID
    .query(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.id, input.id));
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      return user;
    }),

  // Protected: requires session
  updateProfile: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({ name: input.name, updatedAt: new Date() })
        .where(eq(users.id, ctx.session.user.id))
        .returning();
      return updated;
    }),
});
```

## Procedure Types

- `publicProcedure` — no auth required
- `protectedProcedure` — requires `ctx.session`, throws `UNAUTHORIZED` if missing
- Create custom procedures for role-based access:

```typescript
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
```

## Input Validation with Zod

Always validate inputs. Define schemas at the **top of the router file** (this project has no `src/lib/validators/` folder); the client can reuse types via `RouterInputs` from `~/trpc/react`:

```typescript
// top of src/server/api/routers/postRouter.ts
import { z } from "zod";

const createPostSchema = z.object({
  title: z.string().min(1, "Title required").max(256),
  content: z.string().min(1).max(10000),
  published: z.boolean().default(false),
});
```

## Error Handling

```typescript
import { TRPCError } from "@trpc/server";

// Use TRPCError with appropriate codes:
throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
throw new TRPCError({ code: "FORBIDDEN", message: "Not your post" });
throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid input" });
throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });
```

## Root Router — Always Update When Adding New Routers

```typescript
// src/server/api/root.ts
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { userRouter } from "./routers/user";
import { postRouter } from "./routers/post";

export const appRouter = createTRPCRouter({
  user: userRouter,
  post: postRouter,
  // add new routers here
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
```

## Calling tRPC in Server Components

```typescript
// src/trpc/server.ts
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { cache } from "react";

const createContext = cache(async () => {
  const session = await getSession();
  return createTRPCContext({ session });
});

export const api = createCaller(createContext);
```

## Optimistic Updates in Client Components

```typescript
"use client";
const utils = api.useUtils();
const like = api.post.like.useMutation({
  onMutate: async ({ postId }) => {
    await utils.post.getById.cancel({ id: postId });
    const prev = utils.post.getById.getData({ id: postId });
    utils.post.getById.setData({ id: postId }, (old) =>
      old ? { ...old, likes: old.likes + 1 } : old,
    );
    return { prev };
  },
  onError: (_err, { postId }, ctx) => {
    utils.post.getById.setData({ id: postId }, ctx?.prev);
  },
  onSettled: (_data, _err, { postId }) => {
    utils.post.getById.invalidate({ id: postId });
  },
});
```
