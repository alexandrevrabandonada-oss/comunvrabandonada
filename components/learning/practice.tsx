"use client";
import Link from "next/link";
import { useState } from "react";
import type { Mission } from "@/lib/learning/core";
import type { Event, SchoolSnapshot } from "./types";
export function PracticeForm({
  mission,
  snapshot,
  busy,
  send,
}: {
  mission: Mission;
  snapshot: SchoolSnapshot;
  busy: boolean;
  send: (event: Event) => Promise<unknown>;
}) {
  const existing = snapshot.practices.find((p) => p.mission_id === mission.id);
  const [pautaId, setPautaId] = useState(
    existing?.pauta_id ?? snapshot.pautas[0]?.id ?? "",
  );
  const [taskId, setTaskId] = useState(existing?.task_id ?? "");
  const [reflection, setReflection] = useState(existing?.reflection ?? "");
  const pauta = snapshot.pautas.find((p) => p.id === pautaId);
  if (existing?.state === "validated")
    return (
      <p className="school-feedback">
        Prática validada pela equipe. Você pode seguir sua formação.
      </p>
    );
  if (existing?.state === "pending")
    return (
      <div className="school-notice">
        <h3>Enviada para revisão</h3>
        <p>
          Sua prática foi vinculada à pauta. O conteúdo está estudado; a
          aplicação aguarda a equipe.
        </p>
      </div>
    );
  if (!snapshot.pautas.length)
    return (
      <div className="school-notice">
        <p>
          Participe de uma pauta para vincular sua prática. Seu conteúdo
          estudado já está salvo.
        </p>
        <Link className="school-button" href="/comun/pautas">
          Escolher uma pauta
        </Link>
      </div>
    );
  return (
    <form
      className="school-practice-form"
      onSubmit={async (event) => {
        event.preventDefault();
        await send({
          event: "practice",
          missionId: mission.id,
          pautaId,
          taskId: taskId || null,
          reflection,
        });
      }}
    >
      {existing?.state === "revision_requested" ? (
        <p className="school-notice">
          Revisão solicitada:{" "}
          {existing.review_note ||
            "Revise o registro e explique melhor como aplicou a ferramenta."}
        </p>
      ) : null}
      <label htmlFor="practice-pauta">Sua pauta</label>
      <select
        id="practice-pauta"
        required
        value={pautaId}
        disabled={busy}
        onChange={(event) => {
          setPautaId(event.target.value);
          setTaskId("");
        }}
      >
        {snapshot.pautas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
      {pauta ? (
        <Link className="school-link" href={`/comun/pautas/${pauta.slug}`}>
          Abrir pauta e fazer a atividade
        </Link>
      ) : null}
      <label htmlFor="practice-task">Tarefa existente (opcional)</label>
      <select
        id="practice-task"
        value={taskId}
        disabled={busy}
        onChange={(event) => setTaskId(event.target.value)}
      >
        <option value="">Vincular somente à pauta</option>
        {snapshot.tasks
          .filter((t) => t.pauta_id === pautaId)
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
      </select>
      <label htmlFor="practice-reflection">
        O que você fez e onde está o registro?
      </label>
      <textarea
        id="practice-reflection"
        required
        minLength={20}
        maxLength={1200}
        rows={5}
        value={reflection}
        disabled={busy}
        onChange={(event) => setReflection(event.target.value)}
        placeholder="Descreva a aplicação e indique o registro ou tarefa na pauta."
      />
      <p className="school-meta">
        Este texto é privado e será lido pela equipe de revisão. Não inclua
        contatos nem dados pessoais de terceiros. Enviar não altera o estado da
        tarefa.
      </p>
      <button
        className="school-button"
        disabled={busy || reflection.trim().length < 20}
      >
        Enviar prática para revisão
      </button>
    </form>
  );
}
