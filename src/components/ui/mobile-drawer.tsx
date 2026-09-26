"use client";

import { Drawer } from "antd";
import type { ReactNode } from "react";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function MobileDrawer({
  open,
  onClose,
  title,
  children,
  footer,
}: MobileDrawerProps) {
  return (
    <Drawer
      title={title}
      placement="left"
      onClose={onClose}
      open={open}
      footer={footer}
      size={280}
      styles={{
        body: { padding: 0 },
      }}
    >
      {children}
    </Drawer>
  );
}
