import Link from "next/link";
import { notFound } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { requireCommunitySession } from "@/lib/community-auth";
import { getMesaPilotSnapshot } from "@/lib/community-mesa";
import {
  isLearningEnabled,
  getMission,
  missionHref,
} from "@/lib/learning/core";
import { withComunAppV2 } from "@/lib/comun-shell-contract";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { robots: { index: false, follow: false } };

const cardClass =
  "border-2 border-comun-paper/30 p-5 focus-within:border-comun-yellow";
const linkClass =
  "inline-flex min-h-11 items-center font-black text-comun-yellow underline underline-offset-4";

export default async function CommunityMesaPilot({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();

  const { user } = await requireCommunitySession("/comun/c/" + slug + "/mesa");
  const mesa = await getMesaPilotSnapshot(slug, user.id);
  if (mesa.kind === "forbidden") notFound();

  if (mesa.kind === "unavailable") {
    return (
      <ComunShell>
        <Section>
          <h1 className="text-3xl font-black uppercase">Mesa indisponível</h1>
          <p role="status" className="mt-4 max-w-xl">
            Não foi possível validar seu acesso agora. Nenhuma informação
            organizativa foi carregada. Tente novamente mais tarde.
          </p>
          <Link className={linkClass} href="/comun/minha-participacao">
            Voltar à minha área
          </Link>
        </Section>
      </ComunShell>
    );
  }

  return (
    <ComunShell>
      <Section>
        <div
          data-comun-mesa-private="true"
          className="min-w-0 break-words rounded-2xl bg-comun-black p-5 text-comun-paper sm:p-8"
        >
          <p className="text-xs font-black uppercase text-comun-yellow">
            Mesa privada · Somente leitura
          </p>
          <h1
            id="mesa-title"
            className="mt-2 text-3xl font-black uppercase sm:text-5xl"
          >
            Mesa organizativa
          </h1>
          <p className="mt-2 max-w-2xl font-bold">{mesa.communityName}</p>
          <h2 className="mt-6 text-xl font-black">O que construímos juntos</h2>
          <p className="mt-2 max-w-3xl">
            {mesa.purpose ||
              "Esta comunidade ainda não registrou uma descrição pública de seu propósito."}
          </p>
          <p className="mt-3 max-w-3xl text-comun-paper/80">
            Esta é uma projeção limitada de compromissos existentes para quem
            possui papel comunitário ativo de coordenação ou facilitação. Esse
            papel não comprova ingresso em um núcleo permanente. Nada aqui
            registra presença, deliberação ou aceite de tarefas.
          </p>
          <nav
            aria-label="Navegação da Mesa"
            className="mt-5 flex flex-wrap gap-4"
          >
            <Link href={"/comun/c/" + slug} className={linkClass}>
              Comunidade pública
            </Link>
            <Link
              href={withComunAppV2("/comun/minha-participacao")}
              prefetch={false}
              className={linkClass}
            >
              Minha participação
            </Link>
            <Link
              href={"/comun/c/" + slug + "/participar"}
              className={linkClass}
            >
              Meu vínculo e saída
            </Link>
          </nav>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <section className={cardClass} aria-labelledby="mesa-encontro">
              <h2 id="mesa-encontro" className="text-xl font-black">
                Atividades e encontros
              </h2>
              <p className="mt-3 text-sm">
                Datas publicadas nas ações desta comunidade. Abrir uma atividade
                ou exportar ICS não confirma presença. Confira atualizações na
                ação.
              </p>
              {mesa.activitiesState !== "ready" ? (
                <p role="status" className="mt-3 text-sm">
                  {mesa.activitiesState === "not_released"
                    ? "As atividades ainda não estão liberadas neste ambiente."
                    : "Não foi possível carregar as atividades. Tente novamente mais tarde."}
                </p>
              ) : mesa.activities.filter(
                  (activity) => activity.status !== "completed",
                ).length ? (
                <ul className="mt-3 space-y-3">
                  {mesa.activities
                    .filter((activity) => activity.status !== "completed")
                    .map((activity) => (
                      <li key={activity.slug}>
                        <Link
                          prefetch={false}
                          className={linkClass}
                          href={withComunAppV2("/comun/acoes/" + activity.slug)}
                        >
                          {activity.title}
                        </Link>
                        <p className="text-sm">
                          {activity.startsAt
                            ? "Data registrada: " +
                              new Date(activity.startsAt).toLocaleDateString(
                                "pt-BR",
                                { timeZone: "America/Sao_Paulo" },
                              )
                            : "Data ainda não registrada"}
                        </p>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm">
                  Nenhuma atividade pública em andamento foi encontrada nesta
                  comunidade.
                </p>
              )}
            </section>
            <section className={cardClass} aria-labelledby="mesa-tarefas">
              <h2 id="mesa-tarefas" className="text-xl font-black">
                Atribuições registradas para mim
              </h2>
              <p className="mt-2 text-sm">
                Convite e interesse não são atribuição. O registro abaixo também
                não comprova aceite voluntário; confira sua situação e as opções
                de devolução na ação.
              </p>
              {mesa.tasksState === "not_released" ? (
                <p role="status" className="mt-3 text-sm">
                  As ações coletivas ainda não estão liberadas neste ambiente.
                </p>
              ) : mesa.tasksState === "unavailable" ? (
                <p role="status" className="mt-3 text-sm">
                  Não foi possível consultar suas atribuições agora.
                </p>
              ) : mesa.tasks.length ? (
                <ul className="mt-3 space-y-5">
                  {mesa.tasks.map((task) => (
                    <li
                      key={task.id}
                      className="border-t border-comun-paper/25 pt-3"
                    >
                      <strong className="block">{task.title}</strong>
                      <p className="mt-1 text-sm">{task.description}</p>
                      <p className="mt-1 text-xs text-comun-paper/70">
                        Ação: {task.actionTitle}
                        {task.dueAt
                          ? " · Prazo registrado: " +
                            new Date(task.dueAt).toLocaleDateString("pt-BR")
                          : ""}
                      </p>
                      <Link
                        prefetch={false}
                        className={linkClass}
                        href={withComunAppV2("/comun/acoes/" + task.actionSlug)}
                      >
                        Ver ação e opções de participação
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm">
                  Não há atribuições públicas ativas registradas para você nesta
                  comunidade. Uma atribuição não equivale a aceite.
                </p>
              )}
            </section>
            <section className={cardClass} aria-labelledby="mesa-formacao">
              <h2 id="mesa-formacao" className="text-xl font-black">
                Estudo e prática
              </h2>
              <p className="mt-3 text-sm">
                Formação voluntária. Não condiciona vínculo nem concede papel
                automaticamente.
              </p>
              {isLearningEnabled() ? (
                <div>
                  <ul className="mt-3 space-y-2">
                    {["reuniao-termina-em-acao", "facilite-de-verdade"].map(
                      (id) => {
                        const mission = getMission(id);
                        return mission ? (
                          <li key={id}>
                            <Link
                              prefetch={false}
                              href={withComunAppV2(missionHref(id))}
                              className={linkClass}
                            >
                              {mission.title}
                            </Link>
                          </li>
                        ) : null;
                      },
                    )}
                  </ul>
                  <Link
                    prefetch={false}
                    href={withComunAppV2("/comun/escola")}
                    className={linkClass}
                  >
                    Abrir Escola
                  </Link>
                </div>
              ) : (
                <p role="status" className="mt-2 text-sm">
                  A Escola ainda não está liberada neste ambiente.
                </p>
              )}
            </section>
            <section className={cardClass} aria-labelledby="mesa-memoria">
              <h2 id="mesa-memoria" className="text-xl font-black">
                Decisões e memória
              </h2>
              <p className="mt-3 text-sm">
                Nenhuma ata ou decisão interna foi certificada para esta
                experiência. Resultados públicos continuam na comunidade, sem
                transformar reações em votos.
              </p>
              {mesa.activitiesState === "ready" ? (
                <ul className="mt-3 space-y-2">
                  {mesa.activities
                    .filter((activity) => activity.status === "completed")
                    .map((activity) => (
                      <li key={activity.slug}>
                        <Link
                          prefetch={false}
                          className={linkClass}
                          href={withComunAppV2("/comun/acoes/" + activity.slug)}
                        >
                          Resultado e memória: {activity.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              ) : null}
              <Link
                prefetch={false}
                href={"/comun/c/" + slug}
                className={linkClass}
              >
                Ver memória pública
              </Link>
            </section>
            <section className={cardClass} aria-labelledby="mesa-cuidado">
              <h2 id="mesa-cuidado" className="text-xl font-black">
                Acolhimento, pausa e saída
              </h2>
              <p className="mt-3 text-sm">
                Pausar ou deixar a comunidade é voluntário. Esta Mesa não
                monitora faltas nem exige justificativas pessoais.
              </p>
              <p className="mt-3 text-sm">
                Antes de pausar, você pode rever suas atribuições nas ações
                acima. Devolver uma atribuição não escolhe automaticamente outra
                pessoa. A substituição e a transferência de contexto precisam
                ser combinadas pelos canais autorizados; esta Mesa não registra
                sucessão nem compartilha dados privados.
              </p>
              <Link
                href={"/comun/c/" + slug + "/participar"}
                className={linkClass}
              >
                Rever vínculo e preferências
              </Link>
            </section>
          </div>
        </div>
      </Section>
    </ComunShell>
  );
}
