"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { theme } from "antd";

import { getMobileNavItems, type UserRole } from "~/lib/nav-config";

interface MobileBottomNavProps {
  userRole: UserRole;
}

export function MobileBottomNav({ userRole }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { token } = theme.useToken();
  const items = getMobileNavItems(userRole);

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="Mobile navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "calc(64px + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: token.colorBgContainer,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
      }}
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 64,
              minHeight: 48,
              padding: "8px 4px",
              color: active ? token.colorPrimary : token.colorTextSecondary,
              textDecoration: "none",
              fontSize: 11,
              gap: 4,
            }}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
