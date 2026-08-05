import { ComunShell, Section } from "@/components/comun-shell";
import { CommunityGoogleCompletionForm } from "@/components/community-google-completion-form";
import { requireCommunitySession } from "@/lib/community-auth";
import { safeCommunityReturn } from "@/lib/community-return";
import { redirect } from "next/navigation";

export default async function CompletarConta({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeCommunityReturn(params.returnTo);
  const { profile } = await requireCommunitySession(returnTo);
  if (profile?.onboarding_completed_at) redirect(returnTo);
  return (
    <ComunShell>
      <Section>
        <div className="mx-auto max-w-xl bg-comun-paper p-6 text-comun-black sm:p-8">
          <p className="text-xs font-black uppercase text-comun-concrete">Quase pronto</p>
          <h1 className="mt-2 text-3xl font-black uppercase">Completar conta</h1>
          <p className="mt-3 text-comun-asphalt/80">
            Confirme como deseja aparecer e aceite os termos antes de entrar na experiência comunitária completa.
          </p>
          <div className="mt-6">
            <CommunityGoogleCompletionForm
              displayName={profile?.display_name ?? "Pessoa participante"}
              returnTo={returnTo}
            />
          </div>
        </div>
      </Section>
    </ComunShell>
  );
}
