---
description: "Structured bug-report-style prompt for debugging. Emphasizes root-cause analysis, regression tests, and minimal fixes."
---

Fix: **[BUG_SUMMARY]**

## 1. Symptom / Actual behavior

[What is currently broken — exact UI behavior, wrong output, or error.]

## 2. Expected behavior

[What should happen when the bug is fixed.]

## 3. Reproduction

[Steps to reproduce, or the failing test / command.]

## 4. Context

- **File(s) involved:** [list]
- **Error message / stack trace:** [paste]
- **Recent changes:** [relevant commits, PRs, or refactors]
- **Environment:** [local / dev / prod / test]
- **What has already been tried:** [so the agent does not repeat it]

## 5. Constraints

- Address the root cause, not the symptom; prefer minimal upstream fixes over downstream workarounds.
- Do not change public APIs or function signatures unless the fix requires it.
- Add or update a regression test where feasible.
- Do not touch unrelated files.
- Handle errors gracefully; avoid defensive `try/catch` blankets that hide failures.

## 6. Acceptance Criteria

- [ ] The reproduction no longer fails.
- [ ] New or updated regression test passes.
- [ ] `pnpm check` passes.
- [ ] `pnpm build` passes.
- [ ] Existing tests still pass.

## 7. Hand-off / Autonomy

- For non-trivial bugs, present the root-cause analysis before applying the fix.
- If the fix requires touching multiple files or changing signatures, plan first and wait for approval.
- Use `todo_list` to track investigation, fix, and verification.
