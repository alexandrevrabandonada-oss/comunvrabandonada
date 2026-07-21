import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ComunShell, PrimaryLink } from "@/components/comun-shell";
import {
  ComunBreadcrumbs,
  ComunEmptyState,
  ComunSection,
  ComunSectionHeader,
  ComunStatus,
} from "@/components/comun-ui";
import { MyCommunitySummary } from "@/components/my-community-summary";
import { requireCommunitySession } from "@/lib/community-auth";
import {
  communityStatusLabel,
  communityStatusPriority,
} from "@/lib/community-status";
import { getPersonalCenter } from "@/lib/personal-center";
import { listMyParticipation } from "@/lib/pauta-miniapps";
import { listMyIdentificationContributions } from "@/lib/archive-identification";
import { withdrawIdentificationComment } from "@/app/comun/acervo/identificar/actions";

export const dynamic = "force-dynamic";

export default async function MinhaAreaPage() {
  const { user, profile } = await requireCommunitySession("/comun/minha-participacao");
  const [center, submissions, archiveContributions] = await Promise.all([
    getPersonalCenter(user.id),
    listMyParticipation(user.id),
    listMyIdentificationContributions(user.id),
  ]);
  const contributions = [
    ...submissions.contributions,
    ...submissions.artworkSubmissions,
    ...submissions.radioContributions,
  ].sort(
    (a: any, b: any) =>
      communityStatusPriority(b.status) - communityStatusPriority(a.status),
  );
  const attention = center.inbox
    .filter((x: any) => !x.read_at)
    .sort(
      (a: any, b: any) =>
        communityStatusPriority(b.priority) -
        communityStatusPriority(a.priority),
    );
  const empty =
    !attention.length &&
    !contributions.length &&
    !archiveContributions.length &&
    !center.tasks.length &&
    !center.circles.length &&
    !center.memberships.length &&
    !center.actions.length &&
    !center.results.length;
  return (
    <ComunShell>
      <ComunSection>
        <ComunBreadcrumbs
          items={[{ label: "Início", href: "/comun" }, { label: "Minha área" }]}
        />
        <h1 className="text-4xl font-black uppercase text-comun-yellow sm:text-6xl">
          Minha área
        </h1>
        <div className="mt-5 flex items-center gap-4 border-y-2 border-comun-paper/20 py-4"><span className="grid size-12 place-items-center rounded-lg bg-comun-yellow font-black text-comun-black">{String(profile?.display_name??"Pessoa").split(/\s+/).map((x:string)=>x[0]).join("").slice(0,2).toUpperCase()}</span><div><p className="font-black">{profile?.display_name??"Identidade comunitária"}</p><p className="text-sm text-comun-paper/60">Área privada · sem perfil público de popularidade</p></div><Link href="/comun/conta" className="ml-auto text-sm font-bold underline">Configurações</Link></div>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          Organizada pelo que precisa de resposta e pela próxima ação — não por
          linha do tempo infinita.
        </p>
      </ComunSection>
      <MyCommunitySummary memberships={center.communities} />
      {attention.length ? (
        <Area title="Precisa da sua atenção">
          <div className="grid gap-3">
            {attention.slice(0, 5).map((x: any) => (
              <Link
                href={x.action_url}
                key={x.id}
                className="grid gap-3 bg-comun-yellow p-5 text-comun-black sm:grid-cols-[auto_1fr_auto] sm:items-center"
              >
                <ComunStatus>{communityStatusLabel(x.priority)}</ComunStatus>
                <span>
                  <strong className="block uppercase">{x.title}</strong>
                  <small>{x.summary}</small>
                </span>
                <ArrowRight />
              </Link>
            ))}
          </div>
        </Area>
      ) : null}
      {center.circles.length ? (
        <Area title="Próximas rodas">
          <Rows
            rows={center.circles}
            title={(x: any) => x.title}
            status={(x: any) => x.status}
            text={(x: any) => x.public_question}
          />
        </Area>
      ) : null}
      {center.tasks.length ? (
        <Area title="Minhas tarefas">
          <Rows
            rows={center.tasks}
            title={(x: any) => x.title}
            status={(x: any) => x.status}
            text={(x: any) =>
              x.result_public || "Resultado esperado em definição"
            }
          />
        </Area>
      ) : null}
      {center.memberships.length ? (
        <Area title="Acompanhando">
          <div className="grid gap-4 md:grid-cols-2">
            {center.memberships.map((x: any) => (
              <article className="border-2 border-comun-yellow p-5" key={x.id}>
                <ComunStatus>
                  {communityStatusLabel(x.pauta?.public_status || x.status)}
                </ComunStatus>
                <h3 className="mt-3 text-xl font-black">{x.pauta?.title}</h3>
                <p className="mt-2 text-comun-paper/70">
                  {x.pauta?.next_step || x.pauta?.public_synthesis}
                </p>
                <Link
                  href={`/comun/pautas/${x.pauta?.slug}`}
                  className="mt-4 inline-flex min-h-11 items-center font-black uppercase text-comun-yellow underline"
                >
                  Voltar à pauta
                </Link>
              </article>
            ))}
          </div>
        </Area>
      ) : null}
      {contributions.length ? (
        <Area title="Minhas contribuições">
          <Rows
            rows={contributions}
            title={(x: any) =>
              x.title_suggestion || x.circle?.title || "Contribuição"
            }
            status={(x: any) => x.status}
            text={(x: any) => x.next_action_public || "Aguardar revisão"}
          />
        </Area>
      ) : null}
      {archiveContributions.length ? (
        <Area title="Memórias em identificação">
          <div className="grid gap-3">
            {archiveContributions.map((x: any) => (
              <article className="border-2 border-comun-yellow p-4" key={x.id}>
                <p className="text-xs font-black uppercase text-comun-yellow">{x.suggestion_type} · {x.status}</p>
                <h3 className="mt-2 font-black">{x.archive_item?.title ?? "Fotografia histórica"}</h3>
                <div className="mt-3 flex flex-wrap gap-3">
                  {x.public_slug ? <Link className="font-black underline" href={`/comun/acervo/identificar/${x.public_slug}`}>Ver memória</Link> : null}
                  {!['withdrawn','archived'].includes(x.status) && x.public_slug ? <form action={withdrawIdentificationComment}><input type="hidden" name="id" value={x.id}/><input type="hidden" name="slug" value={x.public_slug}/><button className="font-black text-red-300 underline">Retirar contribuição</button></form> : null}
                </div>
              </article>
            ))}
          </div>
        </Area>
      ) : null}
      {center.results.length ? (
        <Area title="Resultados relacionados">
          <Rows
            rows={center.results}
            title={(x: any) => x.title}
            status={() => "result_recorded"}
            text={(x: any) => x.public_summary}
          />
        </Area>
      ) : null}
      {empty ? (
        <ComunSection>
          <div className="border-2 border-comun-yellow p-6">
            <h2 className="text-2xl font-black uppercase text-comun-yellow">
              Sua área está pronta para começar
            </h2>
            <p className="mt-3">
              Conheça uma comunidade ou acompanhe uma pauta. Próximas ações
              aparecerão aqui.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <PrimaryLink href="/comun/comunidades">
                Ver comunidades
              </PrimaryLink>
              <Link href="/comun/pautas" className="font-black underline">
                Explorar pautas
              </Link>
            </div>
          </div>
        </ComunSection>
      ) : null}
      <ComunSection className="pt-0">
        <ComunEmptyState
          href="/comun/caixa-de-entrada"
          label="Abrir caixa de entrada"
        >
          Atualizações significativas ficam na caixa de entrada; ela não é chat
          nem feed social.
        </ComunEmptyState>
      </ComunSection>
    </ComunShell>
  );
}
function Area({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <ComunSection>
      <ComunSectionHeader title={title} />
      {children}
    </ComunSection>
  );
}
function Rows({
  rows,
  title,
  status,
  text,
}: {
  rows: any[];
  title: (x: any) => string;
  status: (x: any) => string;
  text: (x: any) => string;
}) {
  return (
    <div className="divide-y-2 divide-comun-black border-2 border-comun-black bg-comun-paper text-comun-black">
      {rows.map((x) => (
        <article className="grid gap-3 p-4 sm:grid-cols-[auto_1fr]" key={x.id}>
          <ComunStatus>{communityStatusLabel(status(x))}</ComunStatus>
          <div>
            <h3 className="font-black uppercase">{title(x)}</h3>
            <p className="mt-1 text-sm text-comun-asphalt/75">{text(x)}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
