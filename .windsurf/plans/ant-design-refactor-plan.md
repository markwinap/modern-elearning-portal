# Ant Design Refactor Evaluation Plan

## 1. Current State Snapshot

| Item | Value | Notes |
|------|-------|-------|
| `antd` | `^6.4.3` | Latest 6.x is `6.5.1`; v7 not yet stable |
| `@ant-design/nextjs-registry` | `^1.3.0` | Correct for Next.js App Router |
| `next` | `^15.2.3` | `15.3.x` is stable; `15.3` stabilised `turbopack` at root config |
| `react` / `react-dom` | `^19.0.0` | Ant Design 6 supports React 19 |
| `better-auth` | `^1.3` | Latest stable `1.6.23`; `1.7` in RC |
| `drizzle-orm` / `drizzle-kit` | `^0.45.2` / `^0.31.10` | These versions are **mismatched** (kit is tied to older 0.44.x line) |
| `@trpc/*` | `^11.0.0` | `11.1.x` is latest stable |
| `@tanstack/react-query` | `^5.69.0` | Can stay on 5.x |

Ant Design usage is functional and idiomatic, but several patterns are repeated across the 68 client components. The goals are to **upgrade to current stable minors**, **eliminate duplicated UI code**, **adopt Ant Design 6 CSS-variable/zero-runtime features**, and **improve server/client boundaries**.

## 2. Quick Audit Findings

Repetitive Ant Design/UX patterns found in `src/`:

- `theme.useToken()` in **22 files** — inline `token.*` colors/borders are copy-pasted everywhere.
- `App.useApp()` / `message.useMessage()` in **8 files** — mutation success/error toast handling is duplicated.
- `useMutation({ onSuccess: () => { message.success(...); utils.x.invalidate(...) }, onError: (e) => message.error(e.message) })` pattern in **~24 files**.
- `STATUS_COLORS` (`draft`/`published`/`archived`) repeated in `teacher-dashboard.tsx`, `edit-course-form.tsx`, `course-manage-layout.tsx`.
- `TYPE_COLORS` and `ACTIVITY_TYPES` repeated in `section-builder.tsx`, `activity-editor.tsx`.
- Activity-type icon mapping (`lesson` → `PlayCircleOutlined`, etc.) repeated in `learn-sidebar.tsx` and should be reusable.
- Inline flex-page-header style (`display: 'flex'`, `justifyContent: 'space-between'`, `alignItems: 'center'`, `marginBottom: ...`) appears in `teach/page.tsx`, `edit-course-form.tsx`, `notifications-list.tsx`, `admin/page.tsx`, `my-courses` views, etc.
- `Empty` state with icon + title + description duplicated in `course-catalog.tsx`, `teacher-dashboard.tsx`, `my-course-list.tsx`.
- Modal + Form create/edit pattern duplicated in `section-builder.tsx`, `course-session-manager.tsx`, `categories-manager.tsx`, `quiz-editor.tsx`.
- Loading skeletons (`admin/courses/loading.tsx`, `admin/loading.tsx`, `my-courses/loading.tsx`, `courses/loading.tsx`) use different ad-hoc layouts.
- `DashboardLayoutShell` and `AdminLayoutShell` (`src/app/(dashboard)/_components/dashboard-layout-shell.tsx` and `src/app/(admin)/_components/admin-layout-shell.tsx`) are 90 % identical.
- `admin-stats-grid.tsx` and `dashboard-content.tsx` both hand-roll `Card > Statistic` grids.

## 3. Recommended Reusable Components

Proposed new files under `src/components/ui/` and `src/lib/`:

| Component / Util | Purpose | Replaces |
|------------------|---------|----------|
| `ui/status-badge.tsx` | `<StatusBadge status={...} />` rendering `draft`/`published`/`archived` with the correct `Tag` color. | `STATUS_COLORS` maps in `teacher-dashboard.tsx`, `edit-course-form.tsx`, `course-manage-layout.tsx` |
| `ui/activity-badge.tsx` | `<ActivityBadge type={...} />` and `<ActivityIcon type={...} />` with `TYPE_COLORS` and icon mapping. | `TYPE_COLORS` + `activityIcon()` in `activity-editor.tsx`, `section-builder.tsx`, `learn-sidebar.tsx` |
| `ui/page-header.tsx` | Flex row with title, optional actions, consistent `marginBottom` and `gap`. | Repeated inline header `div`s in `teach/page.tsx`, `edit-course-form.tsx`, `notifications-list.tsx`, `admin/page.tsx` |
| `ui/empty-state.tsx` | `<EmptyState icon={...} title={...} description={...} action={...} />` wrapper around `Empty`. | Empty blocks in `course-catalog.tsx`, `teacher-dashboard.tsx`, `my-course-list.tsx` |
| `ui/form-modal.tsx` | `<FormModal form={...} title={...} open={...} onSubmit={...} loading={...} />` combining `Modal` + `Form` with vertical layout and auto-submit. | Add/edit modals in `section-builder.tsx`, `course-session-manager.tsx`, `categories-manager.tsx`, `quiz-editor.tsx` |
| `ui/stats-card.tsx` | `<StatsCard title={...} value={...} icon={...} color={...} />` wrapping `Card` + `Statistic`. | `AdminStatsGrid` items and `dashboard-content.tsx` stat cards |
| `ui/skeleton-list.tsx`, `ui/skeleton-page.tsx` | Standardised loading skeletons for pages and lists. | `admin/loading.tsx`, `admin/courses/loading.tsx`, `courses/loading.tsx`, `my-courses/loading.tsx` |
| `ui/theme-box.tsx` | Tiny wrapper that exposes `token` and replaces repeated `style={{ background: token.colorFillAlter, border: ... }}` blocks. | The repeated `flex` + `border` + `background` item containers in `section-builder.tsx`, `course-session-manager.tsx`, `teacher-dashboard.tsx` |
| `lib/activity-types.ts` | Single source of truth for `ACTIVITY_TYPES`, `TYPE_COLORS`, `ACTIVITY_LABELS`. | `ACTIVITY_TYPES` and `TYPE_COLORS` constants in `section-builder.tsx` / `activity-editor.tsx` |
| `lib/status.ts` | `STATUS_COLORS`, `CourseStatus` type, `isCourseStatus` guard. | `STATUS_COLORS` maps across dashboard/teach/admin |
| `lib/mutation-utils.ts` | `createMutationOptions({ messageApi, successMessage, invalidate })` to reduce `useMutation` boilerplate. | Identical `onSuccess`/`onError` toast + invalidation blocks |
| `hooks/use-toast-mutation.ts` | Optional hook wrapper that combines `App.useApp()` with `useMutation` and auto-invalidates a list of query keys. | Repeated `useMutation({ onSuccess: message.success / utils.x.invalidate })` |

### Layout consolidation
- Merge `DashboardLayoutShell` and `AdminLayoutShell` into a single `DashboardLayoutShell` that accepts an optional `role` prop and defaults `admin` when used from `(admin)/layout.tsx`.
- Extract the `app-sider.tsx` menu configuration into a `nav-config.ts` file per role so menu items are data-driven rather than embedded in the component.

## 4. Upgrade Path

### 4.1 Ant Design ecosystem
- Bump `antd` to latest `^6.5.1` (non-breaking). v6 is fully v5-compatible and adds CSS-variable architecture and `zeroRuntime` support.
- Keep `@ant-design/nextjs-registry@^1.3.0` but consider enabling `cssVar` in `ConfigProvider` to leverage v6's pure CSS-variable mode and reduce JS runtime style generation.
- Add `@ant-design/cssinjs` only if you need direct `StyleProvider` access; otherwise the registry handles it.
- Do **not** move to `antd@7` until it reaches stable; current codebase is on a stable v6 line.

### 4.2 Next.js / React
- Bump `next` to `^15.3.4` (latest 15.x). The `turbopack` config is now a top-level key, so move any `experimental.turbo` config to `turbopack` in `next.config.js`.
- Enable `reactCompiler: true` in `next.config.js` to remove manual `useMemo`/`useCallback` where the compiler can handle it. Ant Design 6 + React 19 is supported.
- Review the custom inline theme script in `src/app/layout.tsx`; it still works, but consider moving it to a `ThemeProvider`-level effect or using `next-themes` if you want less custom code.

### 4.3 tRPC / TanStack Query
- Bump `@trpc/*` to `^11.1.4` (latest stable). Migration from 11.0.x is non-breaking.
- Keep `@tanstack/react-query@^5` but consider using the newer `@trpc/tanstack-react-query` prefetch helpers if you want to prefetch from RSCs and hydrate on the client (optional).
- Experimental tRPC Server Actions (`experimental_caller`) can be trialled for form-heavy pages, but keep existing `useMutation` flow for the first refactor pass.

### 4.4 better-auth
- Bump `better-auth` to `^1.6.23`. Review the breaking changes from `1.3` → `1.6`:
  - `session.freshAge` now calculates from `createdAt`; set `session: { freshAge: 0 }` if you want the old behaviour.
  - `@auth/drizzle-adapter` may need updating; the project uses `better-auth` with a custom drizzle schema.
- The `1.7` RC adds new packages; skip until stable unless you need a specific feature.

### 4.5 Drizzle
- **Fix the version mismatch first.** `drizzle-kit@0.31.x` is designed for the `0.44.x` line of `drizzle-orm`. Either:
  - Downgrade `drizzle-orm` to `^0.44.7` and keep `drizzle-kit@^0.31.10`, or
  - Move both to the Drizzle v1 beta (`drizzle-orm@beta` / `drizzle-kit@beta`) if you want latest features.
- This is a **prerequisite** for running `pnpm db:push` / `pnpm db:generate` safely.

### 4.6 Dev tooling
- `pnpm@10.22.0` is fine. `eslint-config-next@15.2.3` should be bumped to match the `next` version (`15.3.4`).
- The `tsc-errors.txt` warning about npm `public-hoist-pattern` is a pnpm config note, not a TypeScript error, and can be removed.

## 5. Implementation Phases

### Phase 0 — Dependency hygiene (do first)
1. Fix `drizzle-orm` / `drizzle-kit` version pairing.
2. Bump `next`/`eslint-config-next`/`@trpc/*`/`antd`/`better-auth` to latest stable minors.
3. Add `reactCompiler: true` to `next.config.js` and test the build.
4. Run `pnpm check` (`next lint && tsc --noEmit`) and resolve any type regressions.

### Phase 1 — Tokens & primitives
1. Create `src/lib/status.ts` and `src/lib/activity-types.ts`.
2. Build `StatusBadge` and `ActivityBadge`/`ActivityIcon` in `src/components/ui/`.
3. Replace every `STATUS_COLORS` and `TYPE_COLORS` map with the new components.
4. Build `PageHeader` and `EmptyState` and replace the most common inline blocks.

### Phase 2 — Forms & mutations
1. Build `FormModal` and `useToastMutation` (or `mutation-utils`).
2. Refactor `course-session-manager.tsx`, `section-builder.tsx`, `categories-manager.tsx`, and `quiz-editor.tsx` create/edit modals to use `FormModal`.
3. Standardise on `App.useApp()` for message/modal context and remove `message.useMessage()` where possible.

### Phase 3 — Layouts & loading
1. Consolidate `DashboardLayoutShell` + `AdminLayoutShell`.
2. Extract nav config from `app-sider.tsx`.
3. Add `StatsCard` and `SkeletonPage`/`SkeletonList` components and replace one-off skeletons.

### Phase 4 — Theming & performance
1. Evaluate enabling `cssVar` / `zeroRuntime` in `ConfigProvider` (requires checking SSR style extraction with `@ant-design/nextjs-registry`).
2. Replace repeated `theme.useToken()` inline style objects with semantic wrappers (`ThemeBox`, `Card` variants) where it reduces duplication.
3. Review remaining `style={{ ... }}` heavy components (`course-detail-client.tsx`, `quiz-taker.tsx`, `notifications-list.tsx`) for CSS module or utility-class candidates.

## 6. Verification

- `pnpm check` passes after each phase.
- Visual regression with a quick smoke test of dashboard, teach course list, course editor, section builder, and quiz editor.
- Hydration errors in dev are zero (watch for `suppressHydrationWarning` becoming unnecessary).
- No new `any` types introduced; keep strict TypeScript.

## 7. Open Questions

1. **Scope priority:** Should the first pass focus only on Ant Design component refactor, or do you want the dependency upgrades (`next`, `better-auth`, Drizzle fix) included in the same PR?
2. **CSS strategy:** Are you open to enabling Ant Design 6 `cssVar` / `zeroRuntime` mode, or should we keep the current runtime style generation for now?
3. **Server Actions:** Do you want to experiment with tRPC Server Actions for the form-heavy teacher/admin flows, or stick with `useMutation` for this refactor?
4. **Tailwind / CSS Modules:** The project uses inline `style` objects almost everywhere. Would you prefer moving shared layout tokens to CSS Modules, a small set of design-system React components, or keep inline styles but centralised in `theme-box`-like helpers?
