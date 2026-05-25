import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getComunAdminSession } from "@/lib/admin-auth";

export default async function AdminLoginPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const session = await getComunAdminSession();
  if (session) redirect("/comun/admin");

  return <AdminLoginForm redirectTo={searchParams.redirectTo ?? "/comun/admin"} />;
}
