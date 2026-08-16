import Link from "next/link";
import { notFound } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { SolidarityOfferForm } from "@/components/comun-solidarity-economic-content-form";
import { requireCommunitySession } from "@/lib/community-auth";
import { isComunSolidarityEconomicContentWritesEnabled } from "@/lib/comun-solidarity-economic-content";
import { getSolidarityEconomicEditorContext } from "@/lib/server/comun-solidarity-economic-content";
import { createSolidarityOfferAction } from "../../economic-actions";

export const dynamic = "force-dynamic";

export default async function NewSolidarityOfferPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isComunSolidarityEconomicContentWritesEnabled()) notFound();
  const { slug } = await params;
  const session = await requireCommunitySession(`/comun/cooperativas/${slug}/ofertas/nova`);
  const context = await getSolidarityEconomicEditorContext(slug, session.user.id);
  if (!context) notFound();
  return <ComunShell><Section>
    <Link className="font-black underline" href={`/comun/cooperativas/${slug}`}>← {context.detail.organization.publicName}</Link>
    <header className="mt-6 max-w-3xl"><p className="text-xs font-black uppercase tracking-widest">Feirinha · conteúdo da organização</p><h1 className="mt-2 text-4xl font-black">Posso oferecer isso</h1><p className="mt-3">Publique algo que a organização disponibiliza. Não há pedido, pagamento ou conta de vendedor.</p></header>
    <div className="mt-8 max-w-3xl border-2 border-comun-black bg-comun-paper p-5 sm:p-7"><SolidarityOfferForm action={createSolidarityOfferAction} organization={context.detail.organization} /></div>
  </Section></ComunShell>;
}
