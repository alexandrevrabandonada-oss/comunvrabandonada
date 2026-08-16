import { notFound } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import {
  SolidarityOrganizationOnboardingDetailsForm,
  SolidarityOrganizationOnboardingWithdrawForm,
} from "@/components/comun-solidarity-organization-onboarding-form";
import { requireCommunitySession } from "@/lib/community-auth";
import {
  isComunSolidarityOrganizationOnboardingEnabled,
  solidarityOnboardingStateLabel,
} from "@/lib/comun-solidarity-organization-onboarding";
import { getMySolidarityOrganizationOnboarding } from "@/lib/server/comun-solidarity-organization-onboarding";
import {
  saveSolidarityOrganizationOnboardingDetailsAction,
  withdrawSolidarityOrganizationOnboardingAction,
} from "../actions";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ onboardingToken: string }> }) {
  if (!isComunSolidarityOrganizationOnboardingEnabled()) notFound();
  const { onboardingToken } = await params;
  if (!UUID.test(onboardingToken)) notFound();
  const { user } = await requireCommunitySession(`/comun/cooperativas/nova/${onboardingToken}`);
  const onboarding = await getMySolidarityOrganizationOnboarding(onboardingToken, user.id);
  if (!onboarding) notFound();
  const editable = onboarding.state === "draft" || onboarding.state === "needs_changes";
  return <ComunShell>
    <Section>
      <p className="text-xs font-black uppercase tracking-widest text-comun-rust">Feirinha · pedido privado</p>
      <h1 className="mt-2 max-w-3xl text-4xl font-black sm:text-6xl">{onboarding.organizationName}</h1>
      <div role="status" className="mt-5 max-w-2xl border-l-4 border-comun-yellow bg-white p-4">
        <p className="font-black">{solidarityOnboardingStateLabel(onboarding.state)}</p>
        {onboarding.reviewMessagePrivate ? <p className="mt-2 text-sm">{onboarding.reviewMessagePrivate}</p> : null}
      </div>
      {editable ? <div className="mt-8"><SolidarityOrganizationOnboardingDetailsForm action={saveSolidarityOrganizationOnboardingDetailsAction} onboarding={onboarding} /></div> : <StateExplanation state={onboarding.state} />}
      {["draft", "submitted", "needs_changes"].includes(onboarding.state) ? <SolidarityOrganizationOnboardingWithdrawForm action={withdrawSolidarityOrganizationOnboardingAction} continuationToken={onboarding.continuationToken} /> : null}
    </Section>
  </ComunShell>;
}

function StateExplanation({ state }: { state: string }) {
  const copy = state === "submitted"
    ? "A equipe verifica a identidade da organização, a classificação e a fonte. Nenhuma oferta ou necessidade será criada automaticamente."
    : state === "approved"
      ? "A organização foi incluída e seu primeiro acesso de facilitação foi ativado. A ficha pública é o próximo ponto de continuidade."
      : state === "rejected"
        ? "O pedido foi encerrado sem criar território, organização ou acesso."
        : "O pedido foi retirado sem criar território, organização ou acesso.";
  return <p className="mt-8 max-w-2xl text-base">{copy}</p>;
}
