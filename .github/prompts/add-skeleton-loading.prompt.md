---
description: "Add Ant Design Skeleton loading states to tRPC query components that are missing loading indicators"
---

Add skeleton loading states to components with tRPC queries.

## Pattern Overview

For any component using `api.[router].[procedure].useQuery()` without a loading state:

### 1. Import Skeleton

Add to antd imports:

```typescript
import { Skeleton, Space } from "antd";
```

### 2. Destructure isLoading

```typescript
const { data: items = [], isLoading } = api.[router].list.useQuery({ ... });
```

### 3. Add Loading State Before Data Check

Insert before the empty/data conditional:

```typescript
{isLoading ? (
  <Space orientation="vertical" style={{ width: "100%" }}>
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 8px",
          borderRadius: 6,
          background: token.colorFillAlter,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Skeleton.Avatar active size="small" shape="square" />
        <Skeleton.Input active size="small" style={{ flex: 1 }} />
      </div>
    ))}
  </Space>
) : items.length === 0 ? (
  // ... existing empty state
) : (
  // ... existing data rendering
)}
```

## Files to Check

Search for `useQuery` calls in Client Components:

- `src/app/(dashboard)/**/_components/*.tsx`
- `src/app/(admin)/**/_components/*.tsx`

## Skeleton Types by Use Case

| Data Shape   | Skeleton Pattern                                             |
| ------------ | ------------------------------------------------------------ |
| List items   | `Skeleton.Avatar` + `Skeleton.Input` in rows                 |
| Cards/grids  | `Skeleton.Node` or `Skeleton` with `paragraph={{ rows: 3 }}` |
| Tables       | `Skeleton` with `title` + `paragraph`                        |
| Detail pages | `Skeleton` with `avatar` + `paragraph={{ rows: 4 }}`         |

## Requirements

- Match the visual styling of actual items (padding, borders, background)
- Show 2-3 placeholder rows for lists
- Use `active` prop for the animated shimmer effect
- Maintain existing empty and data states below the loading check
