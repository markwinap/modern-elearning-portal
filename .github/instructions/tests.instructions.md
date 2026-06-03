---
applyTo: "**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx,**/__tests__/**"
---

# Testing Rules — Vitest + Playwright

## Unit Tests (Vitest)

### tRPC Router Tests
```typescript
// src/server/api/routers/__tests__/post.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createCallerFactory } from "~/server/api/trpc";
import { appRouter } from "~/server/api/root";
import { mockDb } from "~/test/mocks/db";

const createCaller = createCallerFactory(appRouter);

describe("postRouter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getAll returns posts", async () => {
    const mockPosts = [{ id: "1", title: "Test", content: "Content", authorId: "user-1" }];
    mockDb.select.mockResolvedValue(mockPosts);

    const caller = createCaller({ db: mockDb, session: null });
    const result = await caller.post.getAll();
    expect(result).toEqual(mockPosts);
  });

  it("create requires authentication", async () => {
    const caller = createCaller({ db: mockDb, session: null });
    await expect(caller.post.create({ title: "Test", content: "Content" }))
      .rejects.toThrow("UNAUTHORIZED");
  });
});
```

### Component Tests
```typescript
// src/components/__tests__/PostForm.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PostForm } from "~/components/PostForm";

describe("PostForm", () => {
  it("calls onSubmit with correct values", async () => {
    const onSubmit = vi.fn();
    render(<PostForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("Title"), "My Post");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ title: "My Post" });
    });
  });
});
```

## E2E Tests (Playwright)
```typescript
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("user can sign in", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in with Google" }).click();
    // ... OAuth flow
    await expect(page).toHaveURL("/dashboard");
  });
});
```

## Naming Conventions
- Test files: `ComponentName.test.tsx` or `routerName.test.ts`
- Describe blocks: match the module/component name
- It blocks: plain English descriptions of behavior
- Use `vi.mock()` at module level, `vi.fn()` for individual functions
- Use `beforeEach(() => vi.clearAllMocks())` in every describe block
