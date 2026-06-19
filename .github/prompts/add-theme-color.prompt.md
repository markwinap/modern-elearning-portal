---
description: "Add a new Ant Design theme color token to the project's ConfigProvider — updates ThemeProvider, CSS variables, and dark/light algorithm support"
---

Add a new theme color for: **[COLOR_PURPOSE]** with value **[HEX_COLOR]**

## Requirements

### 1. Read Before Writing
- Read `src/components/theme/theme-provider.tsx` — the single source of truth for all `ConfigProvider` token overrides
- Read `src/components/theme/theme-context.ts` — understand `ThemePreference` and `ThemeContextValue`
- Read `src/styles/globals.css` — check for any existing CSS variables that map to antd tokens
- Read `src/app/layout.tsx` — confirm `ThemeProvider` wraps the entire tree inside `AntdRegistry`

### 2. Choose the Correct Token
Use an antd **semantic color token** that matches the purpose. Common tokens:

| Purpose | Token |
|---|---|
| Brand / primary action | `colorPrimary` |
| Success / positive | `colorSuccess` |
| Warning / caution | `colorWarning` |
| Error / destructive | `colorError` |
| Info / neutral accent | `colorInfo` |
| Link text | `colorLink` |
| Text primary | `colorText` |
| Background layout | `colorBgLayout` |
| Background container | `colorBgContainer` |
| Border default | `colorBorder` |

> If no semantic token fits, use a **component-level token** (e.g., `Button.colorPrimary`) passed via the `components` key in `ConfigProvider`.

### 3. Update `ThemeProvider`
Add the token inside the existing `token` object in `src/components/theme/theme-provider.tsx`:

```typescript
// src/components/theme/theme-provider.tsx
<ConfigProvider
  theme={{
    token: {
      colorPrimary: "#4F46E5",
      colorLink: "#4F46E5",
      borderRadius: 8,
      fontFamily,
      // ✅ Add your new token here
      [TOKEN_NAME]: "[HEX_COLOR]",
    },
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  }}
>
```

**Rules:**
- Do NOT duplicate existing tokens — check the current token list first
- The `darkAlgorithm` / `defaultAlgorithm` will automatically derive dark/light variants — do not add separate dark overrides unless the design explicitly requires a different dark value
- Never import `ConfigProvider` in any other file — all theme tokens live only in `ThemeProvider`

### 4. CSS Variable (optional but recommended)
If the color needs to be referenced outside antd components (e.g., in `globals.css` or Tailwind utilities), add a CSS variable that mirrors the token:

```css
/* src/styles/globals.css */
:root[data-theme="light"] {
  --color-[purpose]: [HEX_COLOR];
}

:root[data-theme="dark"] {
  --color-[purpose]: [DARK_HEX_COLOR]; /* derived or explicit */
}
```

> The `data-theme` attribute is set by `ThemeProvider` via `document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light")`.

### 5. Component-Level Token (if needed)
For overriding a specific component only (e.g., only `Button` primary color):

```typescript
<ConfigProvider
  theme={{
    token: { /* global tokens */ },
    components: {
      Button: {
        colorPrimary: "[HEX_COLOR]",
      },
    },
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  }}
>
```

### 6. Verification Checklist
- [ ] No dot notation used in any antd component imports
- [ ] `ThemeProvider` is the only file with `ConfigProvider` theme token changes
- [ ] Token renders correctly in both light and dark mode (toggle with `useTheme().setPreference`)
- [ ] No `any` types introduced
- [ ] Run `npx tsc --noEmit` — must pass with 0 errors

## Example — Adding a Brand Accent Color

```typescript
// src/components/theme/theme-provider.tsx
token: {
  colorPrimary: "#4F46E5",
  colorLink: "#4F46E5",
  colorSuccess: "#16A34A",   // ✅ new token added
  borderRadius: 8,
  fontFamily,
},
```
