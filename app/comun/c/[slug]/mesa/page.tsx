import Link from "next/link";
import { notFound } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { requireCommunitySession } from "@/lib/community-auth";
import { getMesaPilotSnapshot } from "@/lib/community-mesa";
import { isLearningEnabled } from "@/lib/learning/core";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
        <div data-comun-mesa-private="true">
          <p className="text-xs font-black uppercase text-comun-yellow">
            SOC-D10.M3 · Ensaio privado · Somente leitura
          </p>
          <h1
            id="mesa-title"
            className="mt-2 text-3xl font-black uppercase sm:text-5xl"
          >
            Mesa organizativa
          </h1>
          <p className="mt-2 max-w-2xl font-bold">{mesa.communityName}</p>
          <p className="mt-3 max-w-3xl text-comun-paper/80">
            Esta é uma projeção limitada de compromissos existentes para quem
            possui papel comunitário ativo de coordenação ou facilitação.
            Esse papel não comprova ingresso em um núcleo permanente.
            Nada aqui registra presença, deliberação ou aceite de tarefas.
          </p>
          <nav
            aria-label="Navegação da Mesa"
            className="mt-5 flex flex-wrap gap-4"
          >
            <Link href={"/comun/c/" + slug} className={linkClass}>
              Comunidade pública
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
                Próximo encontro
              </h2>
              <p className="mt-3 text-sm">
                Nenhum encontro privado verificado nesta Mesa. O convite
                comunitário em formato ICS não confirma presença, mudança ou
                cancelamento.
              </p>
            </section>
            <section className={cardClass} aria-labelledby="mesa-tarefas">
              <h2 id="mesa-tarefas" className="text-xl font-black">
                Atribuições registradas para mim
              </h2>
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
                        href={"/comun/acoes/" + task.actionSlug}
                      >
                        Ver ação e opções de participação
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm">
                  Não há atribuições públicas ativas registradas para você
                  nesta comunidade. Uma atribuição não equivale a aceite.
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
                <Link
                  prefetch={false}
                  href="/comun/escola"
                  className={linkClass}
                >
                  Abrir Escola
                </Link>
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
                experiência. Resultados públicos continuam na comunidade,
                sem transformar reações em votos.
              </p>
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
