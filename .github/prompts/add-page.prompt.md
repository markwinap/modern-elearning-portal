---
description: "Scaffold a complete Next.js App Router page: Server Component, Client Components with antd, tRPC integration, metadata, and loading/error states"
---

Create a complete page for route: **[ROUTE_PATH]**

## Requirements Checklist

### 1. Server Component Page (`src/app/[route]/page.tsx`)
- Mark as `async` — fetch data at the server level with `await api.[router].[procedure]()`
- Use `Promise.all()` for parallel independent data fetches
- Export `metadata` or `generateMetadata` for SEO
- Pass fetched data as props to Client Components
- Call `notFound()` if required resource doesn't exist
- Call `redirect("/login")` if auth is required and session is missing

### 2. Loading State (`src/app/[route]/loading.tsx`)
- Use antd `Skeleton` components matching the page layout
- Wrap in a `"use client"` component if using antd

### 3. Error Boundary (`src/app/[route]/error.tsx`)
- Must have `"use client"` directive
- Use antd `Result` component with error status
- Include a "Try Again" button calling `reset()`

### 4. Client Components (`src/app/[route]/_components/`)
- All antd UI components go here
- Prefix file with feature context: `PostsList.tsx`, `PostForm.tsx`
- Use tRPC hooks for client-side mutations and optimistic updates

### 5. Layout (if needed)
- Add `layout.tsx` for shared navigation, sidebars, or auth guards
- Use antd `Layout`, `Sider`, `Header`, `Content` components

## Code Structure Template
```
src/app/[route]/
├── page.tsx         # Server Component — data fetch + SEO
├── loading.tsx      # Skeleton loading state
├── error.tsx        # Error boundary ("use client")
├── layout.tsx       # Optional shared layout
└── _components/
    ├── [Feature]List.tsx    # "use client" — table/list with antd
    ├── [Feature]Form.tsx    # "use client" — form with antd Form
    └── [Feature]Modal.tsx   # "use client" — modal dialog
```

## Accessibility Requirements
- All interactive antd elements must have accessible labels
- Use semantic HTML landmarks (main, nav, header, section)
- Ensure keyboard navigation works for all interactive elements
