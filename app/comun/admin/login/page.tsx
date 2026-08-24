import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { logoutAdmin } from "@/app/actions";
import { getComunAdminAccessState } from "@/lib/admin-auth";
import {
  adminLoginReasonMessage,
  safeAdminReturn,
} from "@/lib/admin-google-auth";
import { isGoogleAuthEnabled } from "@/lib/community-google-auth";
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
    safeAdminReturn(searchParams.redirectTo),
    experience,
  );
  const access = await getComunAdminAccessState();
  if (access.kind === "authorized") redirect(redirectTo);

  if (access.kind === "authenticated_not_authorized") {
    return (
      <section className="industrial-border mx-auto mt-10 grid max-w-md gap-4 bg-comun-paper p-5 text-comun-black">
        <h1 className="text-2xl font-black uppercase">Acesso administrativo</h1>
        <p
          role="alert"
          className="border-2 border-comun-red p-3 font-bold text-comun-red"
        >
          Sua conta está autenticada, mas ainda não possui autorização ativa
          para a área administrativa do COMUN.
        </p>
        <p className="text-sm text-comun-asphalt/75">
          Criar outra conta não libera a curadoria. A autorização editorial é
          concedida separadamente e permanece protegida.
        </p>
        <form action={logoutAdmin}>
          <button className="min-h-12 w-full border-2 border-comun-black bg-comun-yellow px-4 font-black uppercase">
            Sair e entrar com outra conta
          </button>
        </form>
      </section>
    );
  }

  return (
    <AdminLoginForm
      redirectTo={redirectTo}
      googleAuthEnabled={isGoogleAuthEnabled()}
      initialError={adminLoginReasonMessage(searchParams.reason)}
    />
  );
}
