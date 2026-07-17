---
description: "Refactor prompt that preserves behavior, types, and tests while improving code quality or consistency."
---

Refactor: **[TARGET]**

## 1. Goal

[Why refactor and what improvement is expected — e.g., reduce duplication, improve naming, migrate to shared primitive, remove dead code.]

## 2. Scope

### Must change
- [ ]

### Must keep identical
- [public APIs, types, runtime behavior, existing tests]

### Must NOT do
- [e.g., change unrelated files, add new features, bump dependencies]

## 3. Context

- **File(s) to refactor:** [list]
- **Pattern to follow / examples:** [paths to similar refactored code or shared primitives]
- **Consumers:** [files that import or call this code]
- **Verification command:** [e.g., `pnpm test [pattern]`]

## 4. Constraints

- Preserve all public function signatures and runtime behavior.
- Strict TypeScript; no `any` types.
- Named exports; keep existing exports unless explicitly changing.
- Add or update tests if behavior is at risk of changing.
- Do not introduce new dependencies.

## 5. Acceptance Criteria

- [ ] `pnpm check` passes.
- [ ] `pnpm build` passes.
- [ ] Existing tests pass.
- [ ] [specific improvement verified, e.g., duplicate code removed, bundle size reduced]

## 6. Hand-off / Autonomy

- **Plan first** if more than one file is involved. Show the intended before/after diff summary and the files to touch.
- Update `todo_list` as you progress.
- If a refactor reveals a bug or missing test, stop and surface it to the user before fixing it inline.
