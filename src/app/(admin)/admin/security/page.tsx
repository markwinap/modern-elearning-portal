import type { Metadata } from "next";

import { api } from "~/trpc/server";

import { AuditLogViewer } from "./_components/audit-log-viewer";

export const metadata: Metadata = {
  title: "Security & Audit Logs | Modern E-Learning Portal",
};

export default async function SecurityPage() {
  const [{ logs, total }, actions, resourceTypes] = await Promise.all([
    api.audit.list({ page: 1, limit: 25 }),
    api.audit.actions(),
    api.audit.resourceTypes(),
  ]);

  return (
    <AuditLogViewer
      initialLogs={logs}
      initialTotal={total}
      actions={actions}
      resourceTypes={resourceTypes}
    />
  );
}
