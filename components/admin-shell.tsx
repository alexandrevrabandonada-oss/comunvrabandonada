import type { ReactNode } from "react";
import { getAdminNotificationSummary } from "@/lib/admin-notifications";
import { ComunAdminShellClient } from "./comun-admin-shell-client";

export async function AdminShell({
  children,
  adminEmail,
}: {
  children: ReactNode;
  adminEmail: string;
}) {
  const notificationSummary = await getAdminNotificationSummary();
  return (
    <ComunAdminShellClient
      adminEmail={adminEmail}
      notificationSummary={notificationSummary}
    >
      {children}
    </ComunAdminShellClient>
  );
}
