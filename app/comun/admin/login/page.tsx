import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getComunAdminSession } from "@/lib/admin-auth";

export default async function AdminLoginPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams;
  const session = await getComunAdminSession();
  if (session) redirect("/comun/admin");

  return <AdminLoginForm redirectTo={searchParams.redirectTo ?? "/comun/admin"} />;
}
