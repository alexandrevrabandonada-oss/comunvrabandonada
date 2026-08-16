import Link from "next/link";
import { notFound } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { SolidarityEconomicTransitionForm, SolidarityOfferForm } from "@/components/comun-solidarity-economic-content-form";
import { requireCommunitySession } from "@/lib/community-auth";
import { isComunSolidarityEconomicContentWritesEnabled } from "@/lib/comun-solidarity-economic-content";
import { listSolidarityOrganizationEconomicContent } from "@/lib/server/comun-solidarity-economic-content";
import { mutateSolidarityOfferAction } from "../../../economic-actions";

export const dynamic = "force-dynamic";

export default async function EditSolidarityOfferPage({ params }: { params: Promise<{ slug: string; offerSlug: string }> }) {
  if (!isComunSolidarityEconomicContentWritesEnabled()) notFound();
  const { slug, offerSlug } = await params;
  const session = await requireCommunitySession(`/comun/cooperativas/${slug}/ofertas/${offerSlug}/editar`);
  const content = await listSolidarityOrganizationEconomicContent(slug, session.user.id);
  const offer = content?.offers.find((item) => item.slug === offerSlug);
  if (!content || !offer) notFound();
  return <ComunShell><Section>
    <Link className="font-black underline" href={`/comun/cooperativas/${slug}`}>← {content.detail.organization.publicName}</Link>
    <header className="mt-6 max-w-3xl"><p className="text-xs font-black uppercase tracking-widest">Oferta da organização</p><h1 className="mt-2 text-4xl font-black">Editar oferta</h1><p className="mt-3">Qualquer pessoa com acesso ativo de edição ou facilitação pode manter este conteúdo.</p></header>
    <div className="mt-8 max-w-3xl border-2 border-comun-black bg-comun-paper p-5 sm:p-7"><SolidarityOfferForm action={mutateSolidarityOfferAction} organization={content.detail.organization} initial={offer} /></div>
    <section className="mt-6 max-w-3xl border-t-2 border-comun-black pt-5" aria-labelledby="offer-state-title"><h2 id="offer-state-title" className="text-xl font-black">Estado da oferta</h2><div className="mt-3 flex flex-wrap gap-3">{offer.status === "published" && !offer.isExpired ? <SolidarityEconomicTransitionForm action={mutateSolidarityOfferAction} organization={content.detail.organization} entity={{ kind: "offer", id: offer.id }} operation="pause" label="Pausar oferta" /> : null}{offer.status === "paused" && !offer.isExpired ? <SolidarityEconomicTransitionForm action={mutateSolidarityOfferAction} organization={content.detail.organization} entity={{ kind: "offer", id: offer.id }} operation="resume" label="Retomar oferta" /> : null}{offer.isExpired ? <SolidarityEconomicTransitionForm action={mutateSolidarityOfferAction} organization={content.detail.organization} entity={{ kind: "offer", id: offer.id }} operation="renew" label="Renovar por 30 dias" validityDays={30} /> : null}{offer.status !== "archived" ? <SolidarityEconomicTransitionForm action={mutateSolidarityOfferAction} organization={content.detail.organization} entity={{ kind: "offer", id: offer.id }} operation="archive" label="Arquivar" /> : null}</div></section>
  </Section></ComunShell>;
}
