---
description: "Run a thorough code review on selected files checking T3 stack conventions, type safety, security, and performance"
---

Review the selected code for this T3 Stack project. Check each category:

## 1. Type Safety
- [ ] No `any` types — every value is fully typed
- [ ] No unsafe type assertions (`as unknown as X`)
- [ ] tRPC input/output types flow end-to-end without breaks
- [ ] Drizzle `$inferSelect` types used for DB results, not manual interfaces
- [ ] Zod schemas validate all external inputs at procedure boundaries

## 2. Server/Client Boundary
- [ ] Server Components don't import `"use client"` modules directly
- [ ] Client Components have `"use client"` directive
- [ ] No antd components rendered in Server Components
- [ ] No `async/await` in Client Components for data fetching (use hooks instead)
- [ ] Server-only modules use `import "server-only"`

## 3. tRPC Conventions
- [ ] Mutations use `protectedProcedure`, not `publicProcedure`
- [ ] All inputs validated with Zod
- [ ] Ownership verified before update/delete (check `authorId === ctx.session.user.id`)
- [ ] Errors thrown as `TRPCError` with correct codes
- [ ] No direct DB calls in Client Components — everything through tRPC

## 4. Drizzle / Database
- [ ] No raw SQL strings — use Drizzle query builder
- [ ] Multi-step operations wrapped in `db.transaction()`
- [ ] Indexes on columns used in WHERE clauses
- [ ] No N+1 queries — use joins instead of loops with DB calls
- [ ] `updatedAt` set to `new Date()` on every update

## 5. Auth.js / Security
- [ ] Protected pages call `auth()` and redirect if no session
- [ ] Middleware covers all protected routes
- [ ] No sensitive data returned from public procedures
- [ ] Env vars accessed through `env.js`, not `process.env` directly
- [ ] No secrets in client-side code or public env vars

## 6. Ant Design
- [ ] No dot notation subcomponents (`Select.Option`, `Typography.Text`)
- [ ] All antd components inside `"use client"` components
- [ ] Message/notification/modal via `App.useApp()` hooks, not static methods
- [ ] Forms use `Form.useForm()` with typed `FormValues`
- [ ] Loading states shown during mutations (`loading={mutation.isPending}`)

## 7. Performance
- [ ] Independent data fetches parallelized with `Promise.all()`
- [ ] Large lists paginated (not fetching all records)
- [ ] Images use `next/image` with explicit `width` and `height`
- [ ] Dynamic imports for heavy Client Components
- [ ] No unnecessary re-renders from unstable object references

## Output Format
Provide findings as:
- 🔴 **Critical** — security issue, runtime error risk
- 🟡 **Warning** — convention violation, technical debt
- 🟢 **Suggestion** — optimization, readability improvement

End with a summary and the top 3 changes to make.
