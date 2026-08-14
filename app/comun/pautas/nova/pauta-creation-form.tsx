"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import type { PublicEvidenceCitationV1 } from "@/lib/comun-public-evidence";
import {
  createLowFrictionPautaAction,
  initialCreatePautaState,
} from "./actions";

const DRAFT_KEY = "comun:pauta-low-friction-draft:v1";

export function PautaCreationForm({
  authenticated,
  loginHref,
  evidence,
}: {
  authenticated: boolean;
  loginHref: string;
  evidence: PublicEvidenceCitationV1 | null;
}) {
  const [state, action, pending] = useActionState(createLowFrictionPautaAction, initialCreatePautaState);
  const [question, setQuestion] = useState("");
  const [keepEvidence, setKeepEvidence] = useState(Boolean(evidence));
  const questionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const draft = sessionStorage.getItem(DRAFT_KEY);
    if (!draft) return;
    const timeout = window.setTimeout(() => setQuestion(draft.slice(0, 500)), 0);
    return () => window.clearTimeout(timeout);
  }, []);
  useEffect(() => {
    if (state.state === "error" && state.field === "question") questionRef.current?.focus();
  }, [state]);

  function preserveBeforeAuth(event: React.FormEvent<HTMLFormElement>) {
    if (authenticated) return;
    event.preventDefault();
    sessionStorage.setItem(DRAFT_KEY, question);
    window.location.assign(loginHref);
  }

  function restartReview() {
    sessionStorage.setItem(DRAFT_KEY, question);
    window.location.reload();
  }

  return (
    <form action={action} onSubmit={preserveBeforeAuth} className="mt-7 grid gap-5" aria-describedby="pauta-privacy-hint">
      <label htmlFor="pauta-question" className="grid gap-2 text-lg font-black">
        O que você quer entender ou mudar?
        <textarea
          ref={questionRef}
          id="pauta-question"
          name="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          minLength={12}
          maxLength={500}
          rows={6}
          required
          aria-invalid={state.state === "error" && state.field === "question"}
          aria-describedby="pauta-privacy-hint pauta-question-count pauta-form-message"
          placeholder="Como melhorar o ônibus à noite no Retiro?"
          className="w-full border-2 border-comun-black bg-white p-4 text-base font-normal text-comun-asphalt outline-none focus:ring-4 focus:ring-comun-yellow"
        />
      </label>
      <div className="flex items-start justify-between gap-4 text-sm text-comun-paper/70">
        <p id="pauta-privacy-hint">A pauta será pública. Não inclua nomes, contatos, CPF ou detalhes privados.</p>
        <p id="pauta-question-count" aria-live="polite" className="shrink-0">{question.length}/500</p>
      </div>

      {evidence ? (
        <section className="paper-panel border-2 border-comun-black p-4 text-comun-asphalt" aria-labelledby="pauta-evidence-title">
          <p className="text-xs font-black uppercase">Contexto público opcional</p>
          <h2 id="pauta-evidence-title" className="mt-1 text-lg font-black">{evidence.title}</h2>
          <p className="mt-1 text-sm">Período: {evidence.referencePeriod}</p>
          <p className="mt-2 text-sm">{evidence.limitations[0] ?? "Consulte a fonte para compreender o alcance deste dado."}</p>
          <Link href={evidence.publicPath} className="mt-3 inline-flex min-h-10 items-center font-black underline decoration-2 underline-offset-4">Ver fonte no COMUN</Link>
          <label className="mt-4 flex min-h-11 items-center gap-3 border-t border-comun-black/20 pt-3 font-bold">
            <input type="checkbox" name="keep_evidence" checked={keepEvidence} onChange={(event) => setKeepEvidence(event.target.checked)} className="size-5" />
            Adicionar esta evidência como contexto da pauta
          </label>
          <input type="hidden" name="evidence_ref" value={evidence.refId} />
        </section>
      ) : null}

      <label className="hidden" aria-hidden="true">Site da empresa<input name="company_website" tabIndex={-1} autoComplete="off" /></label>
      <div id="pauta-form-message" role={state.state === "error" || state.state === "evidence_changed" ? "alert" : "status"} aria-live="polite">
        {state.state === "error" ? <p className="border-l-4 border-comun-red bg-white p-3 text-sm font-bold text-comun-asphalt">{state.message}</p> : null}
        {state.state === "evidence_changed" ? (
          <div className="paper-panel border-2 border-comun-black p-4 text-comun-asphalt">
            <p className="font-black">A evidência pública mudou ou não está disponível agora.</p>
            <button name="allow_without_evidence" value="1" className="mt-3 min-h-11 border-2 border-comun-black bg-comun-yellow px-4 font-black uppercase">Criar sem vincular esta evidência</button>
          </div>
        ) : null}
        {state.state === "duplicate" ? (
          <div className="paper-panel border-2 border-comun-black p-4 text-comun-asphalt">
            <p className="font-black">Já existe uma pauta com uma questão muito parecida.</p>
            <Link href={`/comun/pautas/${state.slug}`} className="mt-3 inline-flex min-h-11 items-center border-2 border-comun-black bg-comun-yellow px-4 font-black uppercase">Abrir esta pauta</Link>
            <button name="allow_duplicate" value="1" className="mt-3 block min-h-11 font-black underline decoration-2 underline-offset-4">Criar uma nova mesmo assim</button>
            <button type="button" onClick={restartReview} className="mt-2 block min-h-11 font-black underline decoration-2 underline-offset-4">Reescrever minha questão</button>
          </div>
        ) : null}
      </div>

      {state.state !== "duplicate" && state.state !== "evidence_changed" ? (
        <button disabled={pending || question.trim().length < 12} className="min-h-12 w-full border-2 border-comun-black bg-comun-yellow px-5 font-black uppercase text-comun-asphalt disabled:cursor-not-allowed disabled:opacity-55 sm:w-fit">
          {pending ? "Criando pauta…" : authenticated ? "Criar pauta" : "Entrar e continuar"}
        </button>
      ) : null}
      {!authenticated ? <p className="text-sm text-comun-paper/65">Você escreve primeiro. A conta só é pedida ao confirmar, e o texto fica neste aparelho.</p> : null}
    </form>
  );
}
