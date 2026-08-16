import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { SolidarityConnectionForm } from "@/components/comun-solidarity-connection-form";
import { isComunSolidarityPrivateConnectionsEnabled } from "@/lib/comun-solidarity-private-connections";
import { getPublicSolidarityOrganizationDetail } from "@/lib/server/comun-solidarity-organization-governance";
import { createSolidarityConnectionAction } from "../../../connection-actions";

export const dynamic = "force-dynamic";

export default async function NeedHelpPage({
  params,
}: {
  params: Promise<{ slug: string; needSlug: string }>;
}) {
  if (!isComunSolidarityPrivateConnectionsEnabled()) notFound();
  const { slug, needSlug } = await params;
  const detail = await getPublicSolidarityOrganizationDetail(slug);
  const need = detail?.needs.find(
    (item) => item.slug === needSlug && item.organization?.territoryId === detail.organization.territoryId,
  );
  if (!detail || !need) notFound();
  return <ComunShell>
    <header className="border-b-2 border-comun-black bg-comun-yellow px-4 py-8 text-comun-black sm:px-8">
      <Link className="text-sm font-black underline" href={`/comun/cooperativas/${slug}`}>← {detail.organization.publicName}</Link>
      <p className="mt-5 text-xs font-black uppercase tracking-widest">Conexão privada e consentida</p>
      <h1 className="mt-2 text-4xl font-black sm:text-6xl">Posso ajudar</h1>
      <p className="mt-3 max-w-3xl text-lg font-bold">{need.title}</p>
    </header>
    <Section>
      <div className="max-w-2xl">
        <p className="mb-6">Conte como você pode ajudar. A organização lê a mensagem primeiro; o contato permanece protegido até a conexão ser aceita.</p>
        <SolidarityConnectionForm action={createSolidarityConnectionAction} subjectKind="need" subjectId={need.id} subjectSlug={need.slug} subjectTitle={need.title} organizationSlug={detail.organization.slug} organizationTerritoryId={detail.organization.territoryId} initialRequestId={randomUUID()} />
      </div>
    </Section>
  </ComunShell>;
}
