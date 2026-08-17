import Link from "next/link";
import { notFound } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { SolidarityEconomicTransitionForm } from "@/components/comun-solidarity-economic-content-form";
import { getCommunitySession } from "@/lib/community-auth";
import { communityLoginHref } from "@/lib/community-return";
import {
  isComunSolidarityEconomicContentWritesEnabled,
} from "@/lib/comun-solidarity-economic-content";
import {
  formatSolidarityPriceBRL,
  type PublicSolidarityNeedV1,
  type PublicSolidarityOfferV1,
  type PublicSolidarityOrganizationV1,
} from "@/lib/comun-solidarity-economy";
import {
  solidarityNeedStatusLabel,
  solidarityOfferStatusLabel,
} from "@/lib/comun-solidarity-economy-experience";
import {
  isComunSolidarityOrganizationGovernanceEnabled,
  solidarityOrganizationAccessRoleLabel,
  solidarityOrganizationAccessStateLabel,
} from "@/lib/comun-solidarity-organization-governance";
import {
  getMySolidarityOrganizationAccess,
  getPublicSolidarityOrganizationDetail,
  listSolidarityOrganizationGovernance,
} from "@/lib/server/comun-solidarity-organization-governance";
import {
  listSolidarityOrganizationEconomicContent,
  type PrivateSolidarityNeedEditorV1,
  type PrivateSolidarityOfferEditorV1,
} from "@/lib/server/comun-solidarity-economic-content";
import { isComunSolidarityPrivateConnectionsEnabled } from "@/lib/comun-solidarity-private-connections";
import { isComunSolidarityOrganizationProfileSelfEditEnabled } from "@/lib/comun-solidarity-organization-profile";
import {
  listSolidarityOrganizationConnections,
} from "@/lib/server/comun-solidarity-private-connections";
import {
  governOrganizationAccessAction,
  leaveOrganizationAccessAction,
  requestOrganizationAccessAction,
  withdrawOrganizationAccessAction,
} from "./actions";
import { mutateSolidarityNeedAction, mutateSolidarityOfferAction } from "./economic-actions";
import { reviewSolidarityConnectionAction } from "./connection-actions";

export const dynamic = "force-dynamic";

const MODALITY_LABELS = {
  sale: "Venda",
  exchange: "Troca",
  donation: "Doação",
  loan: "Empréstimo",
  cession: "Cessão",
  mutual_aid: "Ajuda mútua",
  cooperation: "Cooperação",
  other: "Outra modalidade",
} as const;

const STATUS_MESSAGES: Record<string, string> = {
  "recebido-comun": "Pedido recebido. Como este é o primeiro vínculo confirmado desta organização no COMUN, precisamos verificar a representação antes de liberar o acesso.",
  "recebido-organizacao": "Pedido recebido. Uma pessoa facilitadora da organização poderá analisar seu vínculo.",
  "nota-invalida": "Conte como você participa usando entre 10 e 600 caracteres.",
  limite: "Você atingiu o limite temporário de pedidos. Tente novamente mais tarde.",
  aguarde: "Aguarde um pouco antes de fazer um novo pedido para esta organização.",
  retirado: "Seu pedido foi retirado.",
  saiu: "Você saiu do acesso desta organização no COMUN.",
  "governanca-atualizada": "A governança da organização foi atualizada.",
  aceita: "Conexão aceita. O contato protegido agora está disponível nesta área privada.",
  recusada: "A conexão não seguirá. O contato protegido foi removido.",
  erro: "Não foi possível concluir esta ação agora. Nenhuma alteração parcial foi feita.",
};

export default async function SolidarityOrganizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ acesso?: string; conexao?: string; perfil?: string }>;
}) {
  if (!isComunSolidarityOrganizationGovernanceEnabled()) notFound();
  const [{ slug }, query, session] = await Promise.all([
    params,
    searchParams,
    getCommunitySession(),
  ]);
  const detail = await getPublicSolidarityOrganizationDetail(slug);
  if (!detail) notFound();
  const access = session?.user
    ? await getMySolidarityOrganizationAccess(
        session.user.id,
        detail.organization.territoryId,
      )
    : null;
  const governance =
    session?.user && access?.state === "active" && access.role === "facilitator"
      ? await listSolidarityOrganizationGovernance(
          detail.organization.territoryId,
          session.user.id,
        )
      : [];
  const economicContent =
    session?.user && access?.state === "active" && isComunSolidarityEconomicContentWritesEnabled()
      ? await listSolidarityOrganizationEconomicContent(slug, session.user.id)
      : null;
  const privateConnectionsEnabled = isComunSolidarityPrivateConnectionsEnabled();
  const profileSelfEditEnabled =
    isComunSolidarityOrganizationProfileSelfEditEnabled();
  const organizationConnections =
    privateConnectionsEnabled && session?.user && access?.state === "active"
      ? await listSolidarityOrganizationConnections(
          detail.organization.territoryId,
          session.user.id,
        )
      : [];
  const statusMessage = query.perfil === "atualizado"
    ? "Perfil atualizado. As informações públicas já refletem as alterações."
    : query.conexao
    ? STATUS_MESSAGES[query.conexao]
    : query.acesso
      ? STATUS_MESSAGES[query.acesso]
      : null;
  return (
    <ComunShell>
      <header className="border-b-2 border-comun-black bg-comun-yellow px-4 py-9 text-comun-black sm:px-8">
        <Link className="text-sm font-black underline" href="/comun/cooperativas">← Feirinha</Link>
        <p className="mt-5 text-xs font-black uppercase tracking-widest">Organização da economia solidária</p>
        <h1 className="mt-2 text-4xl font-black sm:text-6xl">{detail.organization.publicName}</h1>
        {detail.organization.presentation ? <p className="mt-4 max-w-3xl text-lg font-bold">{detail.organization.presentation}</p> : null}
        <dl className="mt-5 grid max-w-3xl gap-3 text-sm sm:grid-cols-2">
          {detail.organization.services.length ? <div><dt className="font-black">Atuação</dt><dd>{detail.organization.services.join(", ")}</dd></div> : null}
          {detail.organization.serviceTerritory ? <div><dt className="font-black">Território de atuação informado</dt><dd>{detail.organization.serviceTerritory}</dd></div> : null}
          {detail.organization.publicContact ? <div><dt className="font-black">Contato público autorizado</dt><dd>{detail.organization.publicContact}</dd></div> : null}
          <div><dt className="font-black">Situação no diretório</dt><dd>Organização verificada para exibição pública</dd></div>
        </dl>
        <Link className="mt-5 inline-flex min-h-11 items-center font-black underline" href={`/comun/mapa/${detail.organization.slug}`}>Ver contexto no mapa</Link>
      </header>
      <Section>
        {statusMessage ? <p role="status" className="mb-6 border-2 border-comun-black bg-white p-4 font-bold text-comun-black">{statusMessage}</p> : null}
        <div className="grid gap-10">
          {access?.state === "active" && access.role ? <OrganizationMaintenanceNavigation organizationSlug={slug} profileEnabled={profileSelfEditEnabled} economicContentEnabled={Boolean(economicContent)} /> : null}
          <OrganizationCollection title="O que está disponível" empty="Por enquanto não há ofertas públicas ativas desta organização publicadas no COMUN.">
            {detail.offers.map((offer) => <Offer key={offer.id} offer={offer} editHref={economicContent ? `/comun/cooperativas/${slug}/ofertas/${offer.slug}/editar` : null} interestHref={privateConnectionsEnabled ? `/comun/cooperativas/${slug}/ofertas/${offer.slug}/interesse` : null} />)}
          </OrganizationCollection>
          <OrganizationCollection title="Do que esta organização precisa" empty="Por enquanto não há necessidades públicas abertas desta organização publicadas no COMUN.">
            {detail.needs.map((need) => <Need key={need.id} need={need} editHref={economicContent ? `/comun/cooperativas/${slug}/necessidades/${need.slug}/editar` : null} helpHref={privateConnectionsEnabled && need.organization ? `/comun/cooperativas/${slug}/necessidades/${need.slug}/ajudar` : null} />)}
          </OrganizationCollection>
          {economicContent ? <EconomicContentPanel organization={detail.organization} offers={economicContent.offers} needs={economicContent.needs} /> : null}
          {privateConnectionsEnabled && access?.state === "active" ? <OrganizationConnectionsPanel organizationSlug={detail.organization.slug} organizationTerritoryId={detail.organization.territoryId} connections={organizationConnections} /> : null}
          <AccessSection
            access={access}
            loggedIn={Boolean(session?.user)}
            organizationSlug={detail.organization.slug}
            organizationTerritoryId={detail.organization.territoryId}
          />
          {governance.length ? <GovernancePanel organizationSlug={detail.organization.slug} organizationTerritoryId={detail.organization.territoryId} records={governance} /> : null}
          <aside className="border-t-2 border-comun-black pt-5 text-sm">
            <h2 className="text-xl font-black">O que este vínculo significa</h2>
            <p className="mt-2 max-w-3xl">O acesso permite colaborar na representação da organização dentro do COMUN. Ele é privado, revogável e não comprova propriedade, representação legal, relação de trabalho ou pertencimento no mundo real.</p>
            <p className="mt-2 max-w-3xl">As informações de apresentação podem ser mantidas pela própria organização no COMUN. Nome, tipo e verificação continuam protegidos.</p>
          </aside>
        </div>
      </Section>
    </ComunShell>
  );
}

function OrganizationMaintenanceNavigation({ organizationSlug, profileEnabled, economicContentEnabled }: {
  organizationSlug: string;
  profileEnabled: boolean;
  economicContentEnabled: boolean;
}) {
  return <nav aria-label="Manutenção privada da organização" className="border-2 border-comun-black bg-comun-paper p-5 text-comun-black">
    <p className="text-xs font-black uppercase text-comun-rust">Área privada da organização</p>
    <h2 className="mt-1 text-2xl font-black">Manter informações da organização</h2>
    <p className="mt-2 max-w-2xl text-sm">Use estes atalhos para manter o perfil e o conteúdo da organização. A leitura pública da ficha continua abaixo.</p>
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
      {profileEnabled ? <Link className="inline-flex min-h-11 items-center font-black underline" href={`/comun/cooperativas/${organizationSlug}/editar-perfil`}>Editar perfil</Link> : null}
      {economicContentEnabled ? <Link className="inline-flex min-h-11 items-center font-black underline" href={`/comun/cooperativas/${organizationSlug}/ofertas/nova`}>Oferecer algo</Link> : null}
      {economicContentEnabled ? <Link className="inline-flex min-h-11 items-center font-black underline" href={`/comun/cooperativas/${organizationSlug}/necessidades/nova`}>Registrar necessidade</Link> : null}
    </div>
  </nav>;
}

function AccessSection({ access, loggedIn, organizationSlug, organizationTerritoryId }: {
  access: Awaited<ReturnType<typeof getMySolidarityOrganizationAccess>>;
  loggedIn: boolean;
  organizationSlug: string;
  organizationTerritoryId: string;
}) {
  const returnTo = `/comun/cooperativas/${organizationSlug}`;
  return <section aria-labelledby="access-title" className="border-2 border-comun-black bg-comun-paper p-5 text-comun-black">
    {access ? <p className="text-xs font-black uppercase text-comun-rust">Área privada de participação</p> : null}
    <h2 id="access-title" className="text-2xl font-black">{access ? "Seu vínculo com esta organização" : "Você participa desta organização?"}</h2>
    {!loggedIn ? <div className="mt-3"><p>Entre para pedir um vínculo revogável dentro do COMUN.</p><Link className="mt-4 inline-flex min-h-11 items-center border-2 border-comun-black bg-comun-yellow px-4 font-black" href={communityLoginHref(returnTo)}>Tenho vínculo com esta organização</Link></div> : null}
    {loggedIn && !access ? <form action={requestOrganizationAccessAction} className="mt-4 grid max-w-2xl gap-3">
      <input type="hidden" name="organization_slug" value={organizationSlug} />
      <input type="hidden" name="organization_territory_id" value={organizationTerritoryId} />
      <label className="grid gap-2 font-bold">Como você participa desta organização?
        <textarea className="min-h-32 border-2 border-comun-black bg-white p-3 font-normal" name="participation_note" minLength={10} maxLength={600} required aria-describedby="participation-note-help" />
      </label>
      <p id="participation-note-help" className="text-sm">Entre 10 e 600 caracteres. Não envie CPF, documentos, endereço residencial ou outros dados pessoais.</p>
      <button className="min-h-12 justify-self-start border-2 border-comun-black bg-comun-yellow px-5 font-black">Enviar pedido</button>
    </form> : null}
    {loggedIn && access ? <div className="mt-4">
      <p className="font-black">{solidarityOrganizationAccessStateLabel(access.state)}</p>
      <p className="mt-1 text-sm">{access.state === "pending" ? access.reviewScope === "platform" ? "A equipe do COMUN analisa este primeiro vínculo." : "A facilitação da organização analisa este pedido." : access.role ? `Papel no COMUN: ${solidarityOrganizationAccessRoleLabel(access.role)}.` : "O histórico permanece preservado."}</p>
      {access.state === "pending" ? <form action={withdrawOrganizationAccessAction} className="mt-3"><OrganizationHiddenFields slug={organizationSlug} territoryId={organizationTerritoryId} /><button className="min-h-11 font-black underline">Retirar meu pedido</button></form> : null}
      {access.state === "active" ? <form action={leaveOrganizationAccessAction} className="mt-3"><OrganizationHiddenFields slug={organizationSlug} territoryId={organizationTerritoryId} /><button className="min-h-11 font-black underline">Sair do acesso desta organização</button></form> : null}
    </div> : null}
  </section>;
}

function GovernancePanel({ organizationSlug, organizationTerritoryId, records }: {
  organizationSlug: string;
  organizationTerritoryId: string;
  records: Awaited<ReturnType<typeof listSolidarityOrganizationGovernance>>;
}) {
  return <section aria-labelledby="governance-title" className="border-2 border-comun-black bg-white p-5 text-comun-black">
    <h2 id="governance-title" className="text-2xl font-black">Acessos da organização no COMUN</h2>
    <p className="mt-2 text-sm">Área privada da facilitação. Ela não altera a verificação pública da organização.</p>
    <div className="mt-4 grid gap-3">
      {records.map((record) => <article className="border border-comun-black/40 p-4" key={record.accessId}>
        <p className="font-black">{record.memberLabel}</p>
        <p className="mt-1 text-sm">{record.state === "pending" ? "Pedido de edição aguardando análise" : record.role ? solidarityOrganizationAccessRoleLabel(record.role) : "Acesso"}</p>
        <p className="mt-2 text-sm">{record.requestNotePrivate}</p>
        <p className="mt-1 text-xs">Pedido em {formatPrivateDate(record.requestedAt)}.</p>
        {record.state === "pending" ? <div className="mt-3 flex flex-wrap gap-3"><GovernanceForm operation="approve" label="Aprovar edição" accessId={record.accessId} slug={organizationSlug} territoryId={organizationTerritoryId} /><GovernanceForm operation="reject" label="Não aprovar" accessId={record.accessId} slug={organizationSlug} territoryId={organizationTerritoryId} /></div> : null}
        {record.state === "active" && record.role === "editor" ? <div className="mt-3 flex flex-wrap gap-3"><GovernanceForm operation="promote" label="Promover a facilitador" accessId={record.accessId} slug={organizationSlug} territoryId={organizationTerritoryId} /><GovernanceForm operation="revoke" label="Revogar edição" accessId={record.accessId} slug={organizationSlug} territoryId={organizationTerritoryId} /></div> : null}
      </article>)}
    </div>
  </section>;
}

function GovernanceForm({ operation, label, accessId, slug, territoryId }: { operation: string; label: string; accessId: string; slug: string; territoryId: string }) {
  return <form action={governOrganizationAccessAction}><OrganizationHiddenFields slug={slug} territoryId={territoryId} /><input type="hidden" name="access_id" value={accessId} /><input type="hidden" name="operation" value={operation} /><button className="min-h-11 border-2 border-comun-black px-3 font-black">{label}</button></form>;
}

function OrganizationHiddenFields({ slug, territoryId }: { slug: string; territoryId: string }) {
  return <><input type="hidden" name="organization_slug" value={slug} /><input type="hidden" name="organization_territory_id" value={territoryId} /></>;
}

function OrganizationCollection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return <section><h2 className="text-2xl font-black uppercase">{title}</h2><div className="mt-4 grid gap-4 text-comun-black md:grid-cols-2">{children.length ? children : <p className="border-2 border-dashed border-comun-black/40 bg-white p-5">{empty}</p>}</div></section>;
}

function Offer({ offer, editHref, interestHref }: { offer: PublicSolidarityOfferV1; editHref: string | null; interestHref: string | null }) {
  const price = formatSolidarityPriceBRL(offer.priceAmountCents);
  return <article className="border-2 border-comun-black bg-white p-5"><h3 className="text-xl font-black">{offer.title}</h3><p className="mt-2 text-sm">{offer.summary}</p><p className="mt-3 text-sm font-bold">{offer.modalities.map((modality) => MODALITY_LABELS[modality]).join(" · ")}</p>{price ? <p className="mt-2 font-black">{price}{offer.priceNote ? ` · ${offer.priceNote}` : ""}</p> : null}{offer.availability ? <p className="mt-2 text-sm">{offer.availability}</p> : null}<div className="mt-3 flex flex-wrap gap-4">{interestHref ? <Link className="inline-flex min-h-11 items-center border-2 border-comun-black bg-comun-yellow px-4 font-black" href={interestHref}>Tenho interesse</Link> : null}{editHref ? <Link className="inline-flex min-h-11 items-center font-black underline" href={editHref}>Editar oferta</Link> : null}</div></article>;
}

function Need({ need, editHref, helpHref }: { need: PublicSolidarityNeedV1; editHref: string | null; helpHref: string | null }) {
  return <article className="border-2 border-comun-black bg-white p-5"><h3 className="text-xl font-black">{need.title}</h3><p className="mt-2 text-sm">{need.summary}</p><div className="mt-3 flex flex-wrap gap-4">{helpHref ? <Link className="inline-flex min-h-11 items-center border-2 border-comun-black bg-comun-yellow px-4 font-black" href={helpHref}>Posso ajudar</Link> : null}{editHref ? <Link className="inline-flex min-h-11 items-center font-black underline" href={editHref}>Editar necessidade</Link> : null}</div></article>;
}

function OrganizationConnectionsPanel({ organizationSlug, organizationTerritoryId, connections }: {
  organizationSlug: string;
  organizationTerritoryId: string;
  connections: Awaited<ReturnType<typeof listSolidarityOrganizationConnections>>;
}) {
  const pending = connections.filter((item) => item.state !== "accepted");
  const accepted = connections.filter((item) => item.state === "accepted");
  return <section className="border-2 border-comun-black bg-comun-paper p-5 text-comun-black" aria-labelledby="connections-title">
    <p className="text-xs font-black uppercase text-comun-rust">Área privada da organização</p>
    <h2 id="connections-title" className="mt-1 text-2xl font-black">Conexões</h2>
    <p className="mt-2 text-sm">Ao aceitar, o contato informado pela pessoa será disponibilizado na área privada desta organização. Isso não cria pedido, compra, reserva ou compromisso.</p>
    {!connections.length ? <p className="mt-4 border-2 border-dashed border-comun-black/40 bg-white p-4">Por enquanto não há interesses ou ajudas aguardando resposta nesta organização no COMUN.</p> : null}
    <ConnectionGroup title="Aguardando resposta" connections={pending} organizationSlug={organizationSlug} organizationTerritoryId={organizationTerritoryId} />
    <ConnectionGroup title="Aceitas" connections={accepted} organizationSlug={organizationSlug} organizationTerritoryId={organizationTerritoryId} />
  </section>;
}

function ConnectionGroup({ title, connections, organizationSlug, organizationTerritoryId }: {
  title: string;
  connections: Awaited<ReturnType<typeof listSolidarityOrganizationConnections>>;
  organizationSlug: string;
  organizationTerritoryId: string;
}) {
  if (!connections.length) return null;
  return <div className="mt-5"><h3 className="text-lg font-black uppercase">{title}</h3><div className="mt-3 grid gap-3">{connections.map((connection) => <article key={connection.interestId} className="border border-comun-black/40 bg-white p-4">
    <p className="text-xs font-black uppercase text-comun-rust">{connection.kind === "offer_interest" ? "Interesse em oferta" : "Ajuda para necessidade"}</p>
    <h4 className="mt-1 font-black">{connection.subjectTitle}</h4>
    <p className="mt-1 text-sm">{connection.memberLabel} · {formatPrivateDate(connection.createdAt)}</p>
    <p className="mt-3 whitespace-pre-wrap text-sm">{connection.messagePrivate}</p>
    {!connection.subjectIsPublic ? <p className="mt-2 text-sm font-bold">Este item não está mais público.</p> : null}
    {connection.state === "accepted" ? <div className="mt-3 border-l-4 border-comun-yellow pl-3"><p className="font-black">Contato protegido</p><p className="break-words">{connection.contactPrivate ?? "Contato indisponível"}</p><p className="mt-1 text-xs">Use este contato somente para esta conexão. A pessoa pode retirar a autorização no COMUN, embora cópias feitas fora daqui não possam ser recolhidas automaticamente.</p></div> : <p className="mt-3 font-bold">Contato ainda protegido</p>}
    {connection.state !== "accepted" ? <form action={reviewSolidarityConnectionAction} className="mt-4 flex flex-wrap gap-3">
      <input type="hidden" name="organization_slug" value={organizationSlug} /><input type="hidden" name="organization_territory_id" value={organizationTerritoryId} /><input type="hidden" name="interest_id" value={connection.interestId} /><input type="hidden" name="subject_kind" value={connection.kind === "offer_interest" ? "offer" : "need"} />
      <button className="min-h-11 border-2 border-comun-black bg-comun-yellow px-4 font-black" name="decision" value="accept">Aceitar e liberar contato</button><button className="min-h-11 border-2 border-comun-black px-4 font-black" name="decision" value="reject">Não seguir</button>
    </form> : null}
  </article>)}</div></div>;
}

function EconomicContentPanel({ organization, offers, needs }: {
  organization: PublicSolidarityOrganizationV1;
  offers: PrivateSolidarityOfferEditorV1[];
  needs: PrivateSolidarityNeedEditorV1[];
}) {
  const hiddenOffers = offers.filter((offer) => offer.status !== "published" || offer.isExpired);
  const closedNeeds = needs.filter((need) => !["open", "partially_met"].includes(need.status));
  if (!hiddenOffers.length && !closedNeeds.length) return null;
  return <section className="border-2 border-comun-black bg-comun-paper p-5 text-comun-black" aria-labelledby="economic-maintenance-title">
    <h2 id="economic-maintenance-title" className="text-2xl font-black">Conteúdo da organização fora da Feirinha</h2>
    <p className="mt-2 text-sm">Área privada para manutenção. O conteúdo pertence à organização, não à conta que o criou.</p>
    <div className="mt-4 grid gap-4">
      {hiddenOffers.map((offer) => <article className="border border-comun-black/40 bg-white p-4" key={offer.id}><h3 className="font-black">{offer.title}</h3><p className="mt-1 text-sm">{solidarityOfferStatusLabel(offer.status, offer.isExpired)}</p><div className="mt-3 flex flex-wrap gap-2"><Link className="inline-flex min-h-11 items-center font-black underline" href={`/comun/cooperativas/${organization.slug}/ofertas/${offer.slug}/editar`}>Editar</Link>{offer.isExpired ? <SolidarityEconomicTransitionForm action={mutateSolidarityOfferAction} organization={organization} entity={{ kind: "offer", id: offer.id }} operation="renew" label="Renovar por 30 dias" validityDays={30} /> : offer.status === "paused" ? <SolidarityEconomicTransitionForm action={mutateSolidarityOfferAction} organization={organization} entity={{ kind: "offer", id: offer.id }} operation="resume" label="Retomar" /> : null}</div></article>)}
      {closedNeeds.map((need) => <article className="border border-comun-black/40 bg-white p-4" key={need.id}><h3 className="font-black">{need.title}</h3><p className="mt-1 text-sm">{solidarityNeedStatusLabel(need.status)}</p><div className="mt-3 flex flex-wrap gap-2"><Link className="inline-flex min-h-11 items-center font-black underline" href={`/comun/cooperativas/${organization.slug}/necessidades/${need.slug}/editar`}>Editar</Link>{["met", "cancelled"].includes(need.status) ? <SolidarityEconomicTransitionForm action={mutateSolidarityNeedAction} organization={organization} entity={{ kind: "need", id: need.id }} operation="reopen" label="Reabrir" /> : null}</div></article>)}
    </div>
  </section>;
}

function formatPrivateDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
