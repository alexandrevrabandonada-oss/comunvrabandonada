import { notFound } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { SolidarityOrganizationOnboardingStartForm } from "@/components/comun-solidarity-organization-onboarding-form";
import { isComunSolidarityOrganizationOnboardingEnabled } from "@/lib/comun-solidarity-organization-onboarding";
import { createSolidarityOrganizationOnboardingDraftAction } from "./actions";

export const dynamic = "force-dynamic";

export default function Page() {
  if (!isComunSolidarityOrganizationOnboardingEnabled()) notFound();
  return <ComunShell>
    <Section>
      <p className="text-xs font-black uppercase tracking-widest text-comun-rust">Feirinha · entrada de organizações</p>
      <h1 className="mt-2 max-w-3xl text-4xl font-black sm:text-6xl">Incluir uma organização</h1>
      <p className="mt-4 max-w-2xl text-lg">Comece pelo nome. O COMUN guarda um rascunho privado antes de pedir os detalhes de verificação.</p>
      <div className="mt-8">
        <SolidarityOrganizationOnboardingStartForm action={createSolidarityOrganizationOnboardingDraftAction} />
      </div>
      <p className="mt-8 max-w-2xl border-t border-comun-black/30 pt-4 text-sm">Incluir uma organização não cria loja, pedido, pagamento ou conteúdo econômico. A identidade pública só nasce depois de uma verificação única.</p>
    </Section>
  </ComunShell>;
}
