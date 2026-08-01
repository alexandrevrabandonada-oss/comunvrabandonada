import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  ComunEmptyStateV2,
  ComunEntityHeader,
  ComunRelatedSection,
  ComunRelationRail,
} from "@/components/comun-relational";
import { ComunShell, Section } from "@/components/comun-shell";
import {
  getIdentificationItem,
  identificationTypeLabels,
  identificationTypes,
} from "@/lib/archive-identification";
import { getOptionalCommunitySession } from "@/lib/community-auth";
import {
  createComunEntityContext,
  type EntityRelation,
} from "@/lib/comun-entity-context";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
import {
  reportIdentificationComment,
  submitIdentificationComment,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const data = await getIdentificationItem(slug);
  if (!data) notFound();
  const session = await getOptionalCommunitySession();
  const { item, comments, summary } = data as any;
  const replies = (id: string) =>
    comments.filter(
      (comment: any) =>
        comment.parent_id === id &&
        comment.publication_status === "approved_public",
    );
  const roots = comments.filter(
    (comment: any) =>
      (!comment.parent_id &&
        comment.publication_status === "approved_public") ||
      (!comment.parent_id &&
        comment.status === "withdrawn" &&
        replies(comment.id).length),
  );
  const appV2 = isComunAppV2(query.experiencia);

  if (appV2) {
    const relations: EntityRelation[] = [
      {
        kind: "memory",
        slug: "identificar",
        title: "Memórias em identificação",
        href: "/comun/acervo/identificar",
        source: "canonical_route",
      },
      {
        kind: "memory",
        slug: "direitos",
        title: "Crédito, correção ou retirada",
        href: "/comun/acervo/direitos-e-remocao",
        source: "canonical_route",
      },
    ];
    const context = createComunEntityContext({
      kind: "memory",
      id: item.archive_item_id ?? item.id,
      slug,
      title: item.public_title,
      state: stateLabel(item.research_state),
      summary: item.public_prompt,
      primaryAction: {
        href: `/comun/acervo/identificar/${slug}#contribuir`,
        label: session?.user
          ? "Compartilhar uma pista"
          : "Entrar para contribuir",
        description:
          "A contribuição vai para moderação e não altera o Acervo automaticamente.",
      },
      relations,
    });
    return (
      <ComunShell
        appBar={{
          title: item.public_title,
          contextLabel: "Acervo · identificação colaborativa",
          backDestination: "/comun/acervo/identificar",
        }}
      >
        <main
          className="comun-v2-page"
          data-comun-app-v2-page="identification-detail"
        >
          <ComunEntityHeader context={context} />
          <ComunRelationRail relations={relations} />
          <article className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            <IdentificationImage item={item} appV2 />
            <div className="surface-memory rounded-[var(--comun-radius-cultural)] p-5 text-comun-black">
              <p className="font-bold leading-relaxed">{item.public_prompt}</p>
              <p className="mt-5 text-sm text-comun-black/68">
                O título é uma pista de catalogação, não uma legenda confirmada.
                Autoria, data, local e pessoas ainda podem estar incompletos.
              </p>
            </div>
          </article>
          <Notices query={query} />
          <section className="mt-9 grid gap-5 lg:grid-cols-2">
            <div className="surface-result rounded-[var(--comun-radius-card)] p-5 text-comun-black">
              <h2 className="text-2xl font-black normal-case">
                Síntese editorial
              </h2>
              {summary ? (
                <div className="mt-4 grid gap-4">
                  {summary.confirmed_text ? (
                    <Block
                      title="Considerado confirmado"
                      text={summary.confirmed_text}
                      appV2
                    />
                  ) : null}
                  {summary.open_questions_text ? (
                    <Block
                      title="Questões abertas"
                      text={summary.open_questions_text}
                      appV2
                    />
                  ) : null}
                  {summary.disagreement_text ? (
                    <Block
                      title="Divergências"
                      text={summary.disagreement_text}
                      appV2
                    />
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-comun-black/68">
                  Ainda não há síntese publicada. Comentários aprovados não
                  alteram automaticamente os dados do Acervo.
                </p>
              )}
            </div>
            <ContributionForm
              item={item}
              slug={slug}
              logged={Boolean(session?.user)}
              appV2
            />
          </section>
          <ComunRelatedSection title="Contribuições aprovadas">
            {roots.length ? (
              <div className="grid gap-4">
                {roots.map((comment: any) => (
                  <Comment
                    key={comment.id}
                    comment={comment}
                    replies={replies(comment.id)}
                    item={item}
                    slug={slug}
                    logged={Boolean(session?.user)}
                    appV2
                  />
                ))}
              </div>
            ) : (
              <ComunEmptyStateV2
                title="Nenhuma contribuição pública ainda"
                explanation="Uma pessoa pode iniciar a identificação; o texto só aparece depois da revisão humana."
                action={{
                  href: `/comun/acervo/identificar/${slug}#contribuir`,
                  label: session?.user
                    ? "Compartilhar uma pista"
                    : "Entrar para contribuir",
                }}
                secondaryActions={[
                  {
                    href: "/comun/acervo/identificar",
                    label: "Ver outras memórias",
                  },
                ]}
              />
            )}
          </ComunRelatedSection>
        </main>
      </ComunShell>
    );
  }

  return (
    <ComunShell>
      <Section>
        <Link
          href="/comun/acervo/identificar"
          className="font-black uppercase text-comun-yellow"
        >
          ← Todas as memórias
        </Link>
        <article className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <IdentificationImage item={item} />
          <div>
            <p className="font-black uppercase text-comun-yellow">
              Memória em identificação
            </p>
            <h1 className="mt-2 text-3xl font-black uppercase sm:text-4xl">
              {item.public_title}
            </h1>
            <p className="mt-5 border-l-4 border-comun-yellow pl-4 text-lg">
              {item.public_prompt}
            </p>
          </div>
        </article>
        <Notices query={query} />
        <section className="mt-9 grid gap-5 lg:grid-cols-2">
          <div className="border-2 border-comun-paper/30 p-5">
            <h2 className="text-2xl font-black uppercase text-comun-yellow">
              Síntese editorial
            </h2>
            {summary ? (
              <div className="mt-4 grid gap-4">
                {summary.confirmed_text ? (
                  <Block
                    title="Considerado confirmado"
                    text={summary.confirmed_text}
                  />
                ) : null}
                {summary.open_questions_text ? (
                  <Block
                    title="Questões abertas"
                    text={summary.open_questions_text}
                  />
                ) : null}
                {summary.disagreement_text ? (
                  <Block
                    title="Divergências"
                    text={summary.disagreement_text}
                  />
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-comun-paper/70">
                Ainda não há síntese publicada. Comentários aprovados não
                alteram automaticamente os dados do acervo.
              </p>
            )}
          </div>
          <ContributionForm
            item={item}
            slug={slug}
            logged={Boolean(session?.user)}
          />
        </section>
        <section className="mt-10">
          <h2 className="text-3xl font-black uppercase text-comun-yellow">
            Contribuições aprovadas
          </h2>
          {roots.length ? (
            <div className="mt-5 grid gap-4">
              {roots.map((comment: any) => (
                <Comment
                  key={comment.id}
                  comment={comment}
                  replies={replies(comment.id)}
                  item={item}
                  slug={slug}
                  logged={Boolean(session?.user)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 border-2 border-comun-paper/25 p-5">
              Nenhuma contribuição pública ainda. Você pode ajudar a começar.
            </p>
          )}
        </section>
      </Section>
    </ComunShell>
  );
}

function IdentificationImage({
  item,
  appV2 = false,
}: {
  item: any;
  appV2?: boolean;
}) {
  return item.preview_url ? (
    <Image
      src={item.preview_url}
      alt="Fotografia histórica de Volta Redonda em identificação"
      unoptimized
      width={item.preview_width || 1200}
      height={item.preview_height || 900}
      className={`h-auto w-full bg-black object-contain ${appV2 ? "rounded-[var(--comun-radius-cultural)]" : "border-2 border-comun-yellow"}`}
    />
  ) : (
    <div className="grid aspect-[4/3] place-items-center border-2 border-comun-yellow p-8 text-center">
      Esta imagem aguarda restauração técnica.
    </div>
  );
}

function ContributionForm({
  item,
  slug,
  logged,
  parentId,
  appV2 = false,
}: {
  item: any;
  slug: string;
  logged: boolean;
  parentId?: string;
  appV2?: boolean;
}) {
  if (!logged)
    return (
      <div
        id={!parentId ? "contribuir" : undefined}
        className={
          appV2
            ? "surface-action rounded-[var(--comun-radius-card)] p-5 text-comun-black"
            : "border-2 border-comun-yellow p-5"
        }
      >
        <h2
          className={`text-2xl font-black ${appV2 ? "normal-case" : "uppercase text-comun-yellow"}`}
        >
          {parentId ? "Responder" : "O que você reconhece?"}
        </h2>
        <p className="mt-3">
          É preciso entrar para contribuir. A leitura continua pública.
        </p>
        <Link
          className="comun-v2-action mt-4"
          href={`/comun/entrar?returnTo=${encodeURIComponent(
            appV2
              ? withComunAppV2(`/comun/acervo/identificar/${slug}`)
              : `/comun/acervo/identificar/${slug}`,
          )}`}
        >
          Entrar para contribuir
        </Link>
      </div>
    );
  return (
    <form
      id={!parentId ? "contribuir" : undefined}
      action={submitIdentificationComment}
      className={
        appV2
          ? "surface-action rounded-[var(--comun-radius-card)] p-5 text-comun-black"
          : "border-2 border-comun-yellow p-5"
      }
    >
      <h2
        className={`text-xl font-black ${appV2 ? "normal-case" : "uppercase text-comun-yellow"}`}
      >
        {parentId ? "Responder" : "O que você reconhece?"}
      </h2>
      <input type="hidden" name="item_id" value={item.id} />
      <input type="hidden" name="slug" value={slug} />
      {appV2 ? <input type="hidden" name="experiencia" value="app-v2" /> : null}
      {parentId ? (
        <input type="hidden" name="parent_id" value={parentId} />
      ) : null}
      <label className="mt-4 grid gap-1">
        Tipo
        <select
          name="type"
          className="min-h-11 bg-comun-paper p-3 text-comun-black"
        >
          {identificationTypes.map((type) => (
            <option value={type} key={type}>
              {identificationTypeLabels[type]}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 grid gap-1">
        Contribuição
        <textarea
          name="body"
          required
          minLength={10}
          maxLength={3000}
          className="min-h-32 bg-comun-paper p-3 text-comun-black"
          placeholder="Conte o que sabe e como sabe."
        />
      </label>
      <label className="mt-3 grid gap-1">
        Fonte ou referência opcional
        <input
          name="source"
          maxLength={1000}
          className="min-h-11 bg-comun-paper p-3 text-comun-black"
        />
      </label>
      <label className="mt-3 flex gap-2 text-sm">
        <input type="checkbox" name="public_name" required /> Entendo que o nome
        do meu perfil será exibido se o texto for aprovado.
      </label>
      <button className="comun-v2-action mt-4">Enviar para moderação</button>
    </form>
  );
}

function Comment({
  comment,
  replies,
  item,
  slug,
  logged,
  appV2 = false,
}: {
  comment: any;
  replies: any[];
  item: any;
  slug: string;
  logged: boolean;
  appV2?: boolean;
}) {
  const withdrawn = comment.status === "withdrawn";
  return (
    <article
      className={
        appV2
          ? "surface-memory rounded-[var(--comun-radius-cultural)] p-5 text-comun-black"
          : "border-2 border-comun-paper/25 p-5"
      }
    >
      <p className="text-xs font-black uppercase text-comun-rust">
        {withdrawn
          ? "Contribuição retirada"
          : `${identificationTypeLabels[comment.suggestion_type] || "Contribuição"} · ${comment.display_name_snapshot}`}
      </p>
      <p className="mt-3 whitespace-pre-wrap">
        {withdrawn
          ? "O conteúdo foi retirado pela pessoa autora."
          : comment.public_text}
      </p>
      {replies.map((reply) => (
        <div
          className="ml-4 mt-4 border-l-4 border-comun-yellow pl-4"
          key={reply.id}
        >
          <b>{reply.display_name_snapshot}</b>
          <p className="mt-1">{reply.public_text}</p>
        </div>
      ))}
      {!withdrawn ? (
        <details className="mt-4">
          <summary className="cursor-pointer font-black">Responder</summary>
          <div className="mt-3">
            <ContributionForm
              item={item}
              slug={slug}
              logged={logged}
              parentId={comment.id}
              appV2={appV2}
            />
          </div>
        </details>
      ) : null}
      {logged && !withdrawn ? (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer underline">
            Denunciar contribuição
          </summary>
          <form
            action={reportIdentificationComment}
            className="mt-2 grid gap-2"
          >
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="suggestion_id" value={comment.id} />
            {appV2 ? (
              <input type="hidden" name="experiencia" value="app-v2" />
            ) : null}
            <select
              name="reason"
              className="bg-comun-paper p-2 text-comun-black"
            >
              <option value="personal_data">Dado pessoal</option>
              <option value="incorrect_authorship">Autoria incorreta</option>
              <option value="abuse">Abuso</option>
              <option value="offensive_content">Conteúdo ofensivo</option>
              <option value="copyright">Direitos autorais</option>
              <option value="other">Outro</option>
            </select>
            <textarea
              name="details"
              placeholder="Detalhes opcionais"
              className="bg-comun-paper p-2 text-comun-black"
            />
            <button className="justify-self-start border-2 border-comun-black p-2 font-black">
              Enviar denúncia
            </button>
          </form>
        </details>
      ) : null}
    </article>
  );
}

function Block({
  title,
  text,
  appV2 = false,
}: {
  title: string;
  text: string;
  appV2?: boolean;
}) {
  return (
    <div>
      <h3 className={`font-black ${appV2 ? "normal-case" : "uppercase"}`}>
        {title}
      </h3>
      <p
        className={`mt-1 whitespace-pre-wrap text-sm ${appV2 ? "text-comun-black/72" : "text-comun-paper/75"}`}
      >
        {text}
      </p>
    </div>
  );
}

function Notices({ query }: { query: Record<string, string | undefined> }) {
  return (
    <>
      {query.envio === "recebido" ? (
        <Notice>
          Contribuição recebida. Ela só aparecerá após revisão humana.
        </Notice>
      ) : null}
      {query.envio === "limite" ? (
        <Notice>Limite temporário atingido. Tente novamente mais tarde.</Notice>
      ) : null}
      {query.denuncia === "recebida" ? (
        <Notice>Denúncia recebida para revisão prioritária.</Notice>
      ) : null}
    </>
  );
}

function stateLabel(value: string) {
  return (
    (
      {
        unidentified: "Sem identificação",
        has_clues: "Com pistas",
        under_review: "Em pesquisa",
        partially_identified: "Identificação parcial",
        identified: "Identificada",
        disputed: "Com divergência",
      } as Record<string, string>
    )[value] || value
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="surface-alert mt-6 rounded-[var(--comun-radius-card)] p-4 font-black text-comun-black"
    >
      {children}
    </p>
  );
}
