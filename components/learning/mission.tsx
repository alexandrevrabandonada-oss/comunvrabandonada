"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { checkAnswer, type Mission } from "@/lib/learning/core";
import type { Event, SchoolSnapshot } from "./types";
import { PracticeForm } from "./practice";
export function MissionRunner({
  mission,
  snapshot,
  guest,
  login,
  busy,
  send,
}: {
  mission: Mission;
  snapshot: SchoolSnapshot;
  guest: boolean;
  login: string;
  busy: boolean;
  send: (
    event: Event,
  ) => Promise<{ correct?: boolean; feedback?: string } | null>;
}) {
  const progress = snapshot.progress.find((p) => p.mission_id === mission.id);
  const [localStep, setLocalStep] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    text: string;
    step: number;
  } | null>(null);
  const [help, setHelp] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const local = guest || reviewing;
  const step = local ? localStep : (progress?.step ?? 0);
  const displayStep = feedback?.step ?? step;
  const challenge = mission.challenges[displayStep === 1 ? 0 : 1];
  useEffect(() => {
    heading.current?.focus();
  }, [displayStep]);
  async function advance(answer?: number) {
    if (busy) return;
    if (local) {
      if (answer !== undefined) {
        const result = checkAnswer(mission, step, answer);
        setFeedback({ correct: result.correct, text: result.feedback, step });
        if (result.correct) setLocalStep(step + 1);
      } else setLocalStep(step + 1);
      return;
    }
    const result = await send({
      event: answer === undefined ? "continue" : "answer",
      missionId: mission.id,
      revision: progress?.revision ?? 0,
      ...(answer === undefined ? {} : { answer }),
    });
    if (result && answer !== undefined)
      setFeedback({
        correct: result.correct === true,
        text: result.feedback ?? challenge.feedback,
        step,
      });
  }
  return (
    <div className="school-mission">
      <p className="school-meta">
        {mission.number} · {mission.minutes} min ·{" "}
        {reviewing
          ? "Revisão do conteúdo"
          : displayStep < 5
            ? `Etapa ${displayStep + 1} de 6`
            : "Conteúdo estudado"}
      </p>
      <h2 tabIndex={-1} ref={heading}>
        {
          [
            "Começar",
            "Teste sua leitura",
            "Entenda a ferramenta",
            "Teste em outro contexto",
            "Leve para a realidade",
            "Agora, pratique",
          ][displayStep]
        }
      </h2>
      {displayStep === 0 ? (
        <>
          <p>{mission.concept}</p>
          <button
            className="school-button"
            disabled={busy}
            onClick={() => void advance()}
          >
            Começar missão
          </button>
        </>
      ) : null}
      {displayStep === 1 || displayStep === 3 ? (
        <>
          <fieldset disabled={busy || Boolean(feedback)}>
            <legend>{challenge.prompt}</legend>
            <div className="school-answers">
              {challenge.options.map((option, i) => (
                <button
                  className="school-answer"
                  key={option}
                  onClick={() => void advance(i)}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>
          {feedback ? (
            <div role="status" className="school-feedback">
              <h3>
                {feedback.correct
                  ? "Isso mesmo."
                  : "Ainda não. Vamos pensar juntos."}
              </h3>
              <p>{feedback.text}</p>
              <button
                className="school-button"
                disabled={busy}
                onClick={() => setFeedback(null)}
              >
                {feedback.correct ? "Continuar" : "Tentar novamente"}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
      {displayStep === 2 ? (
        <>
          <p>{mission.concept}</p>
          <button
            className="school-link"
            aria-expanded={help}
            onClick={() => setHelp(!help)}
          >
            Ainda não entendi
          </button>
          {help ? <p className="school-notice">{mission.help}</p> : null}
          <button
            className="school-button"
            disabled={busy}
            onClick={() => void advance()}
          >
            Testar em outro contexto
          </button>
        </>
      ) : null}
      {displayStep === 4 ? (
        <>
          <p>{mission.application}</p>
          <Link
            className="school-link"
            href={`/comun/escola/materiais#kit-${mission.resourceId}`}
          >
            Abrir a ferramenta desta missão
          </Link>
          <button
            className="school-button"
            disabled={busy}
            onClick={() => void advance()}
          >
            Concluir conteúdo
          </button>
          <p className="school-meta">
            Esta etapa registra o estudo. A prática será enviada e validada
            separadamente.
          </p>
        </>
      ) : null}
      {displayStep === 5 ? (
        <>
          <p>{mission.application}</p>
          {guest ? (
            <Link className="school-button" href={login}>
              Entrar para salvar e praticar
            </Link>
          ) : mission.requiresPractice ? (
            <PracticeForm
              mission={mission}
              snapshot={snapshot}
              busy={busy}
              send={send}
            />
          ) : (
            <Link className="school-button" href="/comun/escola">
              Ver próxima missão
            </Link>
          )}
          <Link className="school-link" href="/comun/escola">
            Voltar para Hoje
          </Link>
          <button
            className="school-link"
            onClick={() => {
              setReviewing(true);
              setLocalStep(0);
              setFeedback(null);
            }}
          >
            Revisar conteúdo
          </button>
        </>
      ) : null}
      {busy ? <p role="status">Salvando…</p> : null}
    </div>
  );
}
