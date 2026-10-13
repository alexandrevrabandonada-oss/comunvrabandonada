"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ComunShell } from "@/components/comun-shell";
import { communityLoginHref } from "@/lib/community-return";
import {
  catalog,
  emptySnapshot,
  getMission,
  missionHref,
  nextMission,
  trackProgress,
} from "@/lib/learning/core";
import "./school.css";
import type { Event, SchoolSnapshot } from "./types";
import { MissionRunner } from "./mission";

type View =
  "today" | "tracks" | "mission" | "practice" | "resources" | "progress";
const empty: SchoolSnapshot = { ...emptySnapshot, pautas: [], tasks: [] };
const nav = [
  ["Hoje", "/comun/escola", "today"],
  ["Trilhas", "/comun/escola/trilhas", "tracks"],
  ["Prática", "/comun/escola/pratica", "practice"],
  ["Materiais", "/comun/escola/materiais", "resources"],
  ["Meu progresso", "/comun/escola/progresso", "progress"],
];

export function School({
  view,
  missionId,
}: {
  view: View;
  missionId?: string;
}) {
  const [snapshot, setSnapshot] = useState<SchoolSnapshot>(empty);
  const [session, setSession] = useState<
    "loading" | "guest" | "member" | "error"
  >("loading");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const loading = useRef(false);
  const login = communityLoginHref(
    missionId ? missionHref(missionId) : "/comun/escola",
  );
  async function load() {
    if (loading.current) return;
    loading.current = true;
    try {
      const response = await fetch("/api/comun/escola", { cache: "no-store" });
      if (response.status === 401) {
        setSession("guest");
        setSnapshot(empty);
        return;
      }
      if (!response.ok) throw new Error();
      setSnapshot(await response.json());
      setSession("member");
    } catch {
      setSession("error");
      setMessage(
        "Não conseguimos carregar seu progresso. Tente novamente antes de continuar.",
      );
    } finally {
      loading.current = false;
    }
  }
  useEffect(() => {
    let active = true;
    fetch("/api/comun/escola", { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (response.status === 401) {
          setSession("guest");
          return;
        }
        if (!response.ok) throw new Error();
        const data: SchoolSnapshot = await response.json();
        if (active) {
          setSnapshot(data);
          setSession("member");
        }
      })
      .catch(() => {
        if (active) {
          setSession("error");
          setMessage(
            "Não conseguimos carregar seu progresso. Tente novamente antes de continuar.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);
  async function send(event: Event) {
    if (busy || session !== "member") return null;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/comun/escola", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 409 || response.status === 503) await load();
        if (response.status === 401) {
          setSession("guest");
          setSnapshot(empty);
        }
        setMessage(body.message);
        return null;
      }
      setSnapshot(body.snapshot);
      return body.result ?? {};
    } catch {
      setMessage("A conexão falhou. Atualize para conferir o que foi salvo.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  const next = nextMission(snapshot.progress, snapshot.practices);
  const mission = missionId ? getMission(missionId) : null;
  const title =
    view === "mission"
      ? mission?.title
      : nav.find((item) => item[2] === view)?.[0];
  return (
    <ComunShell
      appBar={{
        title: "Escola",
        contextLabel: "Formação de Organizadores",
        backDestination: "/comun/minha-participacao",
      }}
    >
      <div className="school">
        <header className="school-header">
          <Link href="/comun/minha-participacao" className="school-back">
            Minha participação
          </Link>
          <p className="school-brand">Escola COMUN</p>
          <nav aria-label="Escola COMUN">
            {nav.map(([label, href, key]) => (
              <Link
                key={href}
                href={href}
                aria-current={view === key ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <div className="school-body">
          <h1>{title}</h1>
          {session === "loading" ? (
            <p role="status">Carregando seu percurso…</p>
          ) : null}
          {session === "guest" ? (
            <p className="school-notice">
              Você pode experimentar as missões.{" "}
              <Link href={login}>Entre para guardar seu progresso</Link> e
              vincular uma prática.
            </p>
          ) : null}
          {message ? (
            <div className="school-notice" role="status">
              <p>{message}</p>
              <button
                className="school-link"
                onClick={() => void load()}
                disabled={busy}
              >
                Atualizar progresso
              </button>
            </div>
          ) : null}
          {session !== "loading" && session !== "error" ? (
            <>
              {view === "today" ? (
                <>
                  {next ? (
                    <section
                      className="school-next"
                      aria-label="Próxima atividade"
                    >
                      <p>
                        {next.reason === "practice"
                          ? "Prática pendente"
                          : next.reason === "resume"
                            ? "Continue de onde parou"
                            : "Sua próxima missão"}
                      </p>
                      <h2>
                        {next.mission.number} · {next.mission.title}
                      </h2>
                      <p>
                        {next.mission.minutes} min ·{" "}
                        {
                          catalog.tracks.find(
                            (t) => t.id === next.mission.track,
                          )?.title
                        }
                      </p>
                      <Link
                        className="school-button"
                        href={missionHref(next.mission.id)}
                      >
                        {next.reason === "practice"
                          ? "Continuar prática"
                          : "Continuar"}
                      </Link>
                    </section>
                  ) : (
                    <section className="school-next">
                      <h2>Todos os conteúdos foram estudados</h2>
                      <p>Confira o estado das suas práticas no progresso.</p>
                      <Link
                        className="school-button"
                        href="/comun/escola/progresso"
                      >
                        Ver meu progresso
                      </Link>
                    </section>
                  )}
                  <section className="school-section">
                    <h2>Preciso disso agora</h2>
                    <div className="school-shortcuts">
                      {[
                        ["Pesquisar um problema", "pergunta-verificavel"],
                        ["Preparar uma reunião", "reuniao-termina-em-acao"],
                        ["Conversar com alguém", "conversa-individual"],
                        [
                          "Fazer um pedido de informação",
                          "transparencia-e-lai",
                        ],
                        ["Definir uma estratégia", "hipotese-de-mudanca"],
                      ].map(([label, id]) => (
                        <Link key={id} href={missionHref(id)}>
                          {label}
                        </Link>
                      ))}
                    </div>
                  </section>
                  <section className="school-section">
                    <h2>Seu percurso</h2>
                    <p>
                      {snapshot.progress.filter((p) => p.step === 5).length} de
                      24 conteúdos estudados ·{" "}
                      {
                        snapshot.progress.filter(
                          (p) =>
                            p.status === "completed" &&
                            getMission(p.mission_id)?.requiresPractice,
                        ).length
                      }{" "}
                      de 9 práticas validadas.
                    </p>
                    <Link className="school-link" href="/comun/escola/trilhas">
                      Ver as quatro trilhas
                    </Link>
                  </section>
                </>
              ) : null}
              {view === "tracks" ? (
                <>
                  <p>
                    Comece por Fundamentos. Depois, siga Investigação e
                    Organização; reúna os aprendizados em Estratégia. Você
                    também pode abrir uma missão conforme sua necessidade.
                  </p>
                  {catalog.tracks.map((track) => (
                    <section className="school-section" key={track.id}>
                      <h2>{track.title}</h2>
                      <p>{track.description}</p>
                      <ol className="school-mission-list">
                        {catalog.missions
                          .filter((m) => m.track === track.id)
                          .map((m) => {
                            const p = snapshot.progress.find(
                              (item) => item.mission_id === m.id,
                            );
                            return (
                              <li key={m.id}>
                                <Link href={missionHref(m.id)}>
                                  <span>
                                    {m.number} · {m.title}
                                  </span>
                                  <span>
                                    {p?.status === "practice_pending"
                                      ? "Prática pendente"
                                      : p?.step === 5
                                        ? "Conteúdo estudado"
                                        : p
                                          ? "Em andamento"
                                          : `${m.minutes} min`}
                                  </span>
                                </Link>
                              </li>
                            );
                          })}
                      </ol>
                    </section>
                  ))}
                </>
              ) : null}
              {view === "mission" && mission ? (
                <MissionRunner
                  key={mission.id}
                  mission={mission}
                  snapshot={snapshot}
                  guest={session === "guest"}
                  login={login}
                  busy={busy}
                  send={send}
                />
              ) : null}
              {view === "practice" ? (
                <>
                  <p>
                    O conteúdo e a aplicação têm progressos separados. Envie um
                    registro da sua pauta para revisão; a equipe pode validar ou
                    pedir uma melhoria.
                  </p>
                  {catalog.missions
                    .filter((m) => m.requiresPractice)
                    .map((m) => {
                      const p = snapshot.progress.find(
                        (item) => item.mission_id === m.id,
                      );
                      const practice = snapshot.practices.find(
                        (item) => item.mission_id === m.id,
                      );
                      return (
                        <section className="school-section" key={m.id}>
                          <h2>
                            {m.number} · {m.title}
                          </h2>
                          <p>{m.application}</p>
                          <p className="school-meta">
                            {practice?.state === "validated"
                              ? "Prática validada"
                              : practice?.state === "revision_requested"
                                ? "Revisão solicitada"
                                : practice
                                  ? "Enviada para revisão"
                                  : p?.step === 5
                                    ? "Pronta para praticar"
                                    : "Estude o conteúdo para enviar a prática"}
                          </p>
                          <Link
                            className="school-link"
                            href={missionHref(m.id)}
                          >
                            Abrir missão e prática
                          </Link>
                        </section>
                      );
                    })}
                </>
              ) : null}
              {view === "resources" ? (
                <>
                  <p>
                    Ferramentas para usar agora. Guarde um kit para encontrá-lo
                    na sua mochila.
                  </p>
                  <section className="school-section">
                    <h2>Minha mochila</h2>
                    {snapshot.savedResources.length ? (
                      <ul>
                        {snapshot.savedResources.map((id) => (
                          <li key={id}>
                            <a href={`#kit-${id}`}>
                              {
                                catalog.resources.find((r) => r.id === id)
                                  ?.title
                              }
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Você ainda não guardou um kit.</p>
                    )}
                  </section>
                  {catalog.resources.map((resource) => (
                    <section
                      className="school-section"
                      id={`kit-${resource.id}`}
                      key={resource.id}
                    >
                      <h2>{resource.title}</h2>
                      <h3>Essencial</h3>
                      <p>{resource.essential}</p>
                      <h3>Ferramenta</h3>
                      <ol>
                        {resource.tool.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ol>
                      {resource.sources.length ? (
                        <>
                          <h3>Aprofundar</h3>
                          <ul>
                            {resource.sources.map((source) => (
                              <li key={source.url}>
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {source.title}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                      {session === "member" ? (
                        <button
                          className="school-button school-secondary"
                          disabled={busy}
                          onClick={() =>
                            void send({
                              event: "bookmark",
                              resourceId: resource.id,
                            })
                          }
                        >
                          {snapshot.savedResources.includes(resource.id)
                            ? "Retirar da mochila"
                            : "Guardar ferramenta"}
                        </button>
                      ) : (
                        <Link className="school-link" href={login}>
                          Entrar para guardar
                        </Link>
                      )}
                    </section>
                  ))}
                  <p className="school-meta">
                    Versão {catalog.program.version} · Revisão: 06/10/2026 ·{" "}
                    {catalog.program.editor}
                  </p>
                </>
              ) : null}
              {view === "progress" ? (
                <>
                  <p>
                    Estudar um conteúdo e demonstrar sua aplicação são etapas
                    diferentes. Este progresso é privado; as práticas enviadas
                    são revisadas pela equipe autorizada.
                  </p>
                  {catalog.tracks.map((track) => {
                    const p = trackProgress(track.id, snapshot.progress);
                    return (
                      <section className="school-section" key={track.id}>
                        <h2>{track.title}</h2>
                        <label>
                          Conteúdo: {p.learned}/{p.total}
                          <progress value={p.learned} max={p.total} />
                        </label>
                        <label>
                          Prática validada: {p.practiceCompleted}/
                          {p.practiceTotal}
                          <progress
                            value={p.practiceCompleted}
                            max={p.practiceTotal}
                          />
                        </label>
                      </section>
                    );
                  })}
                  <p>
                    Não há ranking, perda de sequência nem pontuação de pessoas.
                    Continue no seu ritmo.
                  </p>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </ComunShell>
  );
}
