import Link from "next/link";
import type { ReactNode } from "react";
import { ComunShell, Section } from "@/components/comun-shell";
import { formatSolidarityPriceBRL, isComunSolidarityEconomyPublicCoreEnabled, type PublicSolidarityNeedV1, type PublicSolidarityOfferV1, type PublicSolidarityOrganizationV1 } from "@/lib/comun-solidarity-economy";
import { isComunSolidarityOrganizationGovernanceEnabled } from "@/lib/comun-solidarity-organization-governance";
import { isComunSolidarityOrganizationOnboardingEnabled } from "@/lib/comun-solidarity-organization-onboarding";
import { listPublicMapData } from "@/lib/popular-map";
import { getPublicSolidarityEconomyDirectory } from "@/lib/server/comun-solidarity-economy-directory";
import { Card, CTA, Hero, Metrics } from "../reciclagem/page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Feirinha | COMUN VR Abandonada" };

const MODALITY_LABELS = { sale: "Venda", exchange: "Troca", donation: "Doação", loan: "Empréstimo", cession: "Cessão", mutual_aid: "Ajuda mútua", cooperation: "Cooperação", other: "Outra modalidade" } as const;

export default async function Page() {
  if (!isComunSolidarityEconomyPublicCoreEnabled()) return <LegacyDirectory />;
  const directory = await getPublicSolidarityEconomyDirectory();
  return <ComunShell>
    <header className="border-b-2 border-comun-black bg-comun-yellow px-4 py-10 text-comun-black sm:px-8">
      <p className="text-xs font-black uppercase tracking-widest">Trocas e economia solidária</p>
      <h1 className="mt-2 text-4xl font-black uppercase sm:text-6xl">Feirinha</h1>
      <p className="mt-3 max-w-2xl text-base font-bold sm:text-lg">Descubra o que organizações disponibilizam, do que a rede precisa e quem faz economia solidária por aqui.</p>
      <p className="mt-3 max-w-2xl text-sm">Esta é uma área de descoberta. O COMUN não recebe pedidos, pagamentos, avaliações ou contratações.</p>
      {isComunSolidarityOrganizationOnboardingEnabled() ? <Link className="mt-5 inline-flex min-h-11 items-center border-2 border-comun-black bg-white px-4 font-black" href="/comun/cooperativas/nova">Incluir uma organização</Link> : null}
    </header>
    <Section>
      {directory.sourceState === "unavailable" ? <div role="status" className="border-2 border-comun-black bg-white p-5 text-comun-black"><h2 className="text-xl font-black">Feirinha temporariamente indisponível</h2><p className="mt-2">Não exibimos dados antigos ou incompletos quando a fonte interna não pode ser verificada.</p></div> :
        <div className="grid gap-12">
          <DirectorySection title="O que está disponível" empty="Por enquanto não há ofertas públicas ativas publicadas no COMUN.">{directory.offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}</DirectorySection>
          <DirectorySection title="Do que estamos precisando" empty="Por enquanto não há necessidades públicas abertas publicadas no COMUN.">{directory.needs.map((need) => <NeedCard key={need.id} need={need} />)}</DirectorySection>
          <DirectorySection title="Quem faz parte da rede" empty="O diretório público de organizações ainda está sendo verificado.">{directory.organizations.map((organization) => <OrganizationCard key={organization.territoryId} organization={organization} />)}</DirectorySection>
          {directory.coverageState === "partial_due_to_safety_cap" ? <p role="status" className="border-l-4 border-comun-yellow pl-4 text-sm">A listagem atingiu o limite seguro desta página. Parte dos registros públicos não foi carregada.</p> : null}
          <aside aria-labelledby="limitations-title" className="border-t-2 border-comun-black pt-6"><h2 id="limitations-title" className="text-xl font-black">O que esta página não faz</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{directory.limitations.map((item) => <li key={item}>{item}</li>)}</ul></aside>
        </div>}
    </Section>
  </ComunShell>;
}

function DirectorySection({ title, empty, children }: { title: string; empty: string; children: ReactNode[] }) {
  const id = `section-${title.toLowerCase().replaceAll(" ", "-")}`;
  return <section aria-labelledby={id}><h2 id={id} className="text-3xl font-black uppercase">{title}</h2><div className="mt-5 grid gap-4 text-comun-black md:grid-cols-2">{children.length ? children : <p className="border-2 border-dashed border-comun-black/50 bg-white p-5">{empty}</p>}</div></section>;
}

function OfferCard({ offer }: { offer: PublicSolidarityOfferV1 }) {
  const price = formatSolidarityPriceBRL(offer.priceAmountCents);
  return <article className="border-2 border-comun-black bg-white p-5 shadow-[4px_4px_0_#0b0b0a]"><p className="text-xs font-black uppercase text-comun-rust">Oferta pública</p><h3 className="mt-1 text-xl font-black">{offer.title}</h3><p className="mt-2 text-sm">{offer.summary}</p><p className="mt-3 text-sm font-bold">Por {offer.organization.publicName}</p><ul aria-label="Modalidades" className="mt-3 flex flex-wrap gap-2">{offer.modalities.map((modality) => <li key={modality} className="border border-comun-black px-2 py-1 text-xs font-bold">{MODALITY_LABELS[modality]}</li>)}</ul>{price ? <p className="mt-3 font-black">{price}{offer.priceNote ? ` · ${offer.priceNote}` : ""}</p> : null}{offer.availability ? <p className="mt-2 text-sm"><strong>Disponibilidade:</strong> {offer.availability}</p> : null}<p className="mt-3 text-xs text-comun-concrete">Válida até {formatDate(offer.validUntil)}.</p></article>;
}

function NeedCard({ need }: { need: PublicSolidarityNeedV1 }) {
  return <article className="border-2 border-comun-black bg-comun-paper p-5"><p className="text-xs font-black uppercase text-comun-rust">Necessidade pública</p><h3 className="mt-1 text-xl font-black">{need.title}</h3><p className="mt-2 text-sm">{need.summary}</p>{need.organization ? <p className="mt-3 text-sm font-bold">{need.organization.publicName}</p> : null}{!need.organization && need.territory ? <p className="mt-3 text-sm font-bold">Contexto territorial: {need.territory.neighborhoodLabel ?? need.territory.municipality ?? "território verificado"}</p> : null}{need.dueAt ? <p className="mt-2 text-xs text-comun-concrete">Data pública informada: {formatDate(need.dueAt)}</p> : null}</article>;
}

function OrganizationCard({ organization }: { organization: PublicSolidarityOrganizationV1 }) {
  const governanceEnabled = isComunSolidarityOrganizationGovernanceEnabled();
  return <article className="border-2 border-comun-black bg-white p-5"><p className="text-xs font-black uppercase text-comun-rust">Organização verificada</p><h3 className="mt-1 text-xl font-black">{organization.publicName}</h3>{organization.presentation ? <p className="mt-2 text-sm">{organization.presentation}</p> : null}{organization.services.length ? <p className="mt-3 text-sm"><strong>Atuação:</strong> {organization.services.join(", ")}</p> : null}{organization.serviceTerritory ? <p className="mt-2 text-sm"><strong>Território de atuação informado:</strong> {organization.serviceTerritory}</p> : null}{organization.publicContact ? <p className="mt-2 text-sm"><strong>Contato público autorizado:</strong> {organization.publicContact}</p> : null}<Link className="mt-4 inline-flex min-h-11 items-center font-black underline" href={governanceEnabled ? `/comun/cooperativas/${organization.slug}` : `/comun/mapa/${organization.slug}`}>{governanceEnabled ? "Ver organização" : "Ver contexto público da organização"}</Link></article>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }

async function LegacyDirectory() {
  const { items } = await listPublicMapData(); const orgs = items.filter((item: any) => item.organization); const needs = orgs.flatMap((item: any) => item.needs);
  return <ComunShell><Hero title="Cooperativas e economia solidária" text="Diretório operacional sem ranking, voltado a serviços, territórios, necessidades e ações."/><Section><Metrics rows={[["Organizações", orgs.length], ["Territórios atendidos", new Set(orgs.map((item: any) => item.organization.service_territory_public).filter(Boolean)).size], ["Necessidades abertas", needs.length], ["Com contato autorizado", orgs.filter((item: any) => item.organization.public_contact_authorized).length]]}/><div className="mt-6 grid gap-4 md:grid-cols-2">{orgs.map((item: any) => <Card x={item} key={item.id}/>)}</div><CTA/></Section></ComunShell>;
}
