import { ComunShell, Section } from "@/components/comun-shell";
import { redirect } from "next/navigation";
import { CommunitySignupForm } from "@/components/community-auth-form";
import { getOptionalCommunitySession } from "@/lib/community-auth";
import { isGoogleAuthEnabled } from "@/lib/community-google-auth";
import { safeCommunityReturn } from "@/lib/community-return";
import { resolveCommunitySignupDestination } from "@/lib/community-signup-continuity";
import {
  COMUN_APP_V2_EXPERIENCE,
  COMUN_LEGACY_EXPERIENCE,
  resolveComunExperience,
  withComunExperience,
} from "@/lib/comun-experience";

export default async function CriarConta({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; experiencia?: string }>;
}) {
  const params = await searchParams;
  const safeReturnTo = safeCommunityReturn(params.returnTo);
  const returnExperience = resolveComunExperience(
    new URL(safeReturnTo, "http://comun.local").searchParams.get("experiencia"),
  );
  const experience =
    params.experiencia === COMUN_LEGACY_EXPERIENCE
      ? COMUN_LEGACY_EXPERIENCE
      : params.experiencia === COMUN_APP_V2_EXPERIENCE
        ? COMUN_APP_V2_EXPERIENCE
        : returnExperience;
  const returnTo = withComunExperience(safeReturnTo, experience);
  const appV2 = experience === COMUN_APP_V2_EXPERIENCE;
  const googleAuthEnabled = isGoogleAuthEnabled();
  const session = await getOptionalCommunitySession();
  const authenticatedDestination = resolveCommunitySignupDestination({
    authenticated: Boolean(session?.user),
    onboardingCompleted: Boolean(session?.profile?.onboarding_completed_at),
    returnTo,
  });
  if (authenticatedDestination) redirect(authenticatedDestination);
  return (
    <ComunShell>
      <Section>
        <div data-comun-auth-continuity={appV2 ? "app-v2" : "legacy"}>
          <h1 className="text-3xl font-black uppercase text-comun-paper sm:text-4xl">
            Criar conta comunitária
          </h1>
          <p className="mt-3 max-w-xl text-comun-paper/75">
            Use um nome que pode ser pseudônimo. Seu e-mail não é público.
            Depois do onboarding curto, você retorna à intenção já escolhida; o
            formulário da ação não é colocado na URL.
          </p>
          <div className="mt-6 max-w-md bg-comun-paper p-5 text-comun-black">
            <CommunitySignupForm
              returnTo={returnTo}
              googleAuthEnabled={googleAuthEnabled}
            />
          </div>
        </div>
      </Section>
    </ComunShell>
  );
}
