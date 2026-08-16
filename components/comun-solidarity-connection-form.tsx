"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  COMUN_SOLIDARITY_CONTACT_CONSENT_COPY,
  initialSolidarityConnectionActionState,
  type SolidarityConnectionActionState,
} from "@/lib/comun-solidarity-private-connections";

type Action = (
  state: SolidarityConnectionActionState,
  formData: FormData,
) => Promise<SolidarityConnectionActionState>;

export function SolidarityConnectionForm({
  action,
  subjectKind,
  subjectId,
  subjectSlug,
  subjectTitle,
  organizationSlug,
  organizationTerritoryId,
  initialRequestId,
}: {
  action: Action;
  subjectKind: "offer" | "need";
  subjectId: string;
  subjectSlug: string;
  subjectTitle: string;
  organizationSlug: string;
  organizationTerritoryId: string;
  initialRequestId: string;
}) {
  const storageKey = `comun:solidarity-connection:v1:${subjectKind}:${subjectId}`;
  const [state, formAction, pending] = useActionState(action, initialSolidarityConnectionActionState);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement | HTMLParagraphElement>(null);
  const [draft, setDraft] = useState(() => {
    const initial = { requestId: initialRequestId, message: "", contact: "", consent: false };
    if (typeof window === "undefined") return initial;
    try {
      const stored = sessionStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) : null;
      return {
        requestId: typeof parsed?.requestId === "string" && parsed.requestId ? parsed.requestId : initialRequestId,
        message: typeof parsed?.message === "string" ? parsed.message : "",
        contact: typeof parsed?.contact === "string" ? parsed.contact : "",
        consent: parsed?.consent === true,
      };
    } catch {
      return initial;
    }
  });
  const success = state.state === "success";
  useEffect(() => {
    if (success) {
      sessionStorage.removeItem(storageKey);
      return;
    }
    sessionStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, storageKey, success]);
  useEffect(() => {
    if (state.state === "success" || state.state === "auth_required") {
      feedbackRef.current?.focus();
      return;
    }
    if (state.state !== "error") return;
    if (state.field === "message") messageRef.current?.focus();
    else if (state.field === "contact") contactRef.current?.focus();
    else if (state.field === "consent") consentRef.current?.focus();
    else feedbackRef.current?.focus();
  }, [state]);

  const describedBy = state.state === "error" ? "connection-feedback" : undefined;

  if (success)
    return <div ref={feedbackRef} role="status" tabIndex={-1} className="border-2 border-comun-black bg-white p-5">
      <h2 className="text-2xl font-black">Conexão enviada</h2>
      <p className="mt-2">A organização recebeu sua mensagem. Seu contato continua protegido até que ela aceite.</p>
      <Link className="mt-4 inline-flex min-h-11 items-center font-black underline" href={state.href}>Acompanhar em Minha participação</Link>
    </div>;

  return <form action={formAction} className="grid gap-5" aria-describedby={describedBy}>
    <input suppressHydrationWarning type="hidden" name="request_id" value={draft.requestId} />
    <input type="hidden" name="subject_kind" value={subjectKind} />
    <input type="hidden" name="subject_id" value={subjectId} />
    <input type="hidden" name="subject_slug" value={subjectSlug} />
    <input type="hidden" name="organization_slug" value={organizationSlug} />
    <input type="hidden" name="organization_territory_id" value={organizationTerritoryId} />
    <label className="grid gap-2 font-bold">Sua mensagem para a organização
      <textarea ref={messageRef} suppressHydrationWarning name="connection_message" minLength={10} maxLength={600} required value={draft.message}
        onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))}
        className="min-h-36 border-2 border-comun-black bg-white p-3 font-normal" aria-describedby="connection-message-help" aria-invalid={state.state === "error" && state.field === "message"} />
    </label>
    <p id="connection-message-help" className="-mt-3 text-sm">Conte por que você se interessou por “{subjectTitle}”. Coloque seu contato no campo protegido abaixo.</p>
    <label className="grid gap-2 font-bold">Contato protegido
      <input ref={contactRef} suppressHydrationWarning name="protected_contact" minLength={3} maxLength={200} required value={draft.contact}
        onChange={(event) => setDraft((current) => ({ ...current, contact: event.target.value }))}
        className="min-h-12 border-2 border-comun-black bg-white px-3 font-normal" aria-describedby="connection-contact-help" aria-invalid={state.state === "error" && state.field === "contact"} />
    </label>
    <p id="connection-contact-help" className="-mt-3 text-sm">Pode ser telefone, e-mail ou identificador. Não envie CPF, documento, senha ou endereço residencial.</p>
    <label className="flex items-start gap-3 border-2 border-comun-black bg-white p-4 text-sm font-bold">
      <input ref={consentRef} suppressHydrationWarning type="checkbox" name="consent_to_contact" value="yes" checked={draft.consent}
        onChange={(event) => setDraft((current) => ({ ...current, consent: event.target.checked }))}
        className="mt-1 size-5 shrink-0" aria-invalid={state.state === "error" && state.field === "consent"} required />
      <span>{COMUN_SOLIDARITY_CONTACT_CONSENT_COPY}</span>
    </label>
    {state.state === "error" ? <p ref={feedbackRef} tabIndex={-1} id="connection-feedback" role="alert" className="border-2 border-comun-rust bg-white p-4 font-bold">{state.message}</p> : null}
    {state.state === "auth_required" ? <div ref={feedbackRef} tabIndex={-1} role="status" className="border-2 border-comun-black bg-white p-4"><p>{state.message}</p><Link className="mt-3 inline-flex min-h-11 items-center font-black underline" href={state.loginHref}>Entrar para continuar</Link></div> : null}
    <button disabled={pending || !draft.requestId} className="min-h-12 justify-self-start border-2 border-comun-black bg-comun-yellow px-5 font-black disabled:opacity-60">
      {pending ? "Enviando…" : subjectKind === "offer" ? "Enviar interesse" : "Oferecer ajuda"}
    </button>
    <p className="text-sm">Isto não cria pedido, compra, reserva, contrato nem conversa automática.</p>
  </form>;
}
