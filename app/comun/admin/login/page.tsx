import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getComunAdminSession } from "@/lib/admin-auth";
import {
  resolveComunExperience,
  withComunExperience,
} from "@/lib/comun-experience";

export default async function AdminLoginPage(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const experience = resolveComunExperience(searchParams.experiencia);
  const redirectTo = withComunExperience(
    searchParams.redirectTo ?? "/comun/admin",
    experience,
  );
  const session = await getComunAdminSession();
  if (session) redirect(redirectTo);

  return <AdminLoginForm redirectTo={redirectTo} />;
}
