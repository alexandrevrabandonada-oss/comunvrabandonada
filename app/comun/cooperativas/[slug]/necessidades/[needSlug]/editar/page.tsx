import Link from "next/link";
import { notFound } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { SolidarityEconomicTransitionForm, SolidarityNeedForm } from "@/components/comun-solidarity-economic-content-form";
import { requireCommunitySession } from "@/lib/community-auth";
import { isComunSolidarityEconomicContentWritesEnabled } from "@/lib/comun-solidarity-economic-content";
import { listSolidarityOrganizationEconomicContent } from "@/lib/server/comun-solidarity-economic-content";
import { mutateSolidarityNeedAction } from "../../../economic-actions";

export const dynamic = "force-dynamic";

export default async function EditSolidarityNeedPage({ params }: { params: Promise<{ slug: string; needSlug: string }> }) {
  if (!isComunSolidarityEconomicContentWritesEnabled()) notFound();
  const { slug, needSlug } = await params;
  const session = await requireCommunitySession(`/comun/cooperativas/${slug}/necessidades/${needSlug}/editar`);
  const content = await listSolidarityOrganizationEconomicContent(slug, session.user.id);
  const need = content?.needs.find((item) => item.slug === needSlug);
  if (!content || !need) notFound();
  return <ComunShell><Section>
    <Link className="font-black underline" href={`/comun/cooperativas/${slug}`}>← {content.detail.organization.publicName}</Link>
    <header className="mt-6 max-w-3xl"><p className="text-xs font-black uppercase tracking-widest">Necessidade da organização</p><h1 className="mt-2 text-4xl font-black">Editar necessidade</h1><p className="mt-3">O conteúdo continua com a organização mesmo se o acesso de quem o publicou mudar.</p></header>
    <div className="mt-8 max-w-3xl border-2 border-comun-black bg-comun-paper p-5 sm:p-7"><SolidarityNeedForm action={mutateSolidarityNeedAction} organization={content.detail.organization} initial={need} /></div>
    <section className="mt-6 max-w-3xl border-t-2 border-comun-black pt-5" aria-labelledby="need-state-title"><h2 id="need-state-title" className="text-xl font-black">Estado da necessidade</h2><div className="mt-3 flex flex-wrap gap-3">{need.status === "open" ? <><SolidarityEconomicTransitionForm action={mutateSolidarityNeedAction} organization={content.detail.organization} entity={{ kind: "need", id: need.id }} operation="partially_met" label="Marcar parcialmente atendida" /><SolidarityEconomicTransitionForm action={mutateSolidarityNeedAction} organization={content.detail.organization} entity={{ kind: "need", id: need.id }} operation="met" label="Marcar atendida" /><SolidarityEconomicTransitionForm action={mutateSolidarityNeedAction} organization={content.detail.organization} entity={{ kind: "need", id: need.id }} operation="cancel" label="Cancelar" /></> : null}{need.status === "partially_met" ? <><SolidarityEconomicTransitionForm action={mutateSolidarityNeedAction} organization={content.detail.organization} entity={{ kind: "need", id: need.id }} operation="met" label="Marcar atendida" /><SolidarityEconomicTransitionForm action={mutateSolidarityNeedAction} organization={content.detail.organization} entity={{ kind: "need", id: need.id }} operation="cancel" label="Cancelar" /></> : null}{["met", "cancelled"].includes(need.status) ? <SolidarityEconomicTransitionForm action={mutateSolidarityNeedAction} organization={content.detail.organization} entity={{ kind: "need", id: need.id }} operation="reopen" label="Reabrir" /> : null}</div></section>
  </Section></ComunShell>;
}
