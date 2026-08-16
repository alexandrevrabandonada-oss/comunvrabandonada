"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  initialSolidarityOnboardingActionState,
  type PrivateSolidarityOrganizationOnboardingV1,
  type SolidarityOnboardingActionState,
} from "@/lib/comun-solidarity-organization-onboarding";

type Action = (
  previous: SolidarityOnboardingActionState,
  formData: FormData,
) => Promise<SolidarityOnboardingActionState>;

const DRAFT_KEY = "comun:a4:organization-onboarding:name:v1";

export function SolidarityOrganizationOnboardingStartForm({
  action,
}: {
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialSolidarityOnboardingActionState,
  );
  const [requestId] = useState(() => globalThis.crypto.randomUUID());
  const router = useRouter();
  const errorRef = useRef<HTMLParagraphElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = globalThis.sessionStorage.getItem(DRAFT_KEY);
      if (stored && nameRef.current) nameRef.current.value = stored.slice(0, 160);
    } catch {
      // Storage is optional; the form remains usable without it.
    }
  }, []);
  function preserveName(value: string) {
    try {
      if (value) globalThis.sessionStorage.setItem(DRAFT_KEY, value);
      else globalThis.sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // Storage is optional; the server remains the authority after save.
    }
  }
  useEffect(() => {
    if (state.state === "auth_required") router.push(state.loginHref);
    if (state.state === "success") {
      try {
        globalThis.sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // Storage is optional; navigation still completes.
      }
      router.push(state.href);
      router.refresh();
    }
    if (state.state === "error") errorRef.current?.focus();
  }, [router, state]);

  return (
    <form action={formAction} className="grid max-w-xl gap-5">
      <input type="hidden" name="request_id" value={requestId} />
      <label className="grid gap-2 text-lg font-black" htmlFor="organization-name">
        Qual organização você quer incluir?
      </label>
      <input
        id="organization-name"
        className="min-h-14 border-2 border-comun-black bg-white px-4 text-lg"
        name="organization_name"
        ref={nameRef}
        onChange={(event) => preserveName(event.target.value)}
        minLength={3}
        maxLength={160}
        autoComplete="organization"
        required
        aria-describedby="organization-name-help onboarding-message"
      />
      <p id="organization-name-help" className="text-sm">
        Pode ser uma cooperativa, associação produtiva, coletivo, grupo informal,
        empreendimento solidário ou rede comunitária.
      </p>
      <input className="hidden" name="company_website" tabIndex={-1} autoComplete="off" />
      {state.state === "error" ? (
        <p id="onboarding-message" ref={errorRef} tabIndex={-1} role="alert" className="border-l-4 border-red-700 pl-3 font-bold">
          {state.message}
        </p>
      ) : null}
      {state.state === "existing_organization" ? (
        <div id="onboarding-message" role="status" className="border-2 border-comun-black bg-white p-4">
          <p className="font-black">{state.message}</p>
          <Link className="mt-3 inline-flex min-h-11 items-center font-black underline" href={state.href}>
            Pedir vínculo com ela
          </Link>
        </div>
      ) : null}
      <button disabled={pending} className="min-h-12 justify-self-start border-2 border-comun-black bg-comun-yellow px-6 font-black disabled:opacity-60">
        {pending ? "Guardando…" : "Continuar"}
      </button>
    </form>
  );
}

export function SolidarityOrganizationOnboardingDetailsForm({
  action,
  onboarding,
}: {
  action: Action;
  onboarding: PrivateSolidarityOrganizationOnboardingV1;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialSolidarityOnboardingActionState,
  );
  const [requestId] = useState(() => globalThis.crypto.randomUUID());
  const router = useRouter();
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.state === "auth_required") router.push(state.loginHref);
    if (state.state === "success") {
      router.push(state.href);
      router.refresh();
    }
    if (state.state === "error") errorRef.current?.focus();
  }, [router, state]);

  return (
    <form action={formAction} className="grid max-w-2xl gap-5">
      <input type="hidden" name="request_id" value={requestId} />
      <input type="hidden" name="continuation_token" value={onboarding.continuationToken} />
      <label className="grid gap-2 font-black">Nome da organização
        <input className="min-h-12 border-2 border-comun-black bg-white px-3 font-normal" name="organization_name" defaultValue={onboarding.organizationName} minLength={3} maxLength={160} required />
      </label>
      <label className="grid gap-2 font-black">Como esta organização se organiza?
        <select className="min-h-12 border-2 border-comun-black bg-white px-3 font-normal" name="organization_type" defaultValue={onboarding.organizationType ?? ""} required>
          <option value="" disabled>Escolha uma opção</option>
          <option value="cooperative">Cooperativa</option>
          <option value="association">Associação produtiva</option>
          <option value="collective">Coletivo</option>
          <option value="informal_group">Grupo informal</option>
          <option value="solidarity_enterprise">Empreendimento solidário</option>
          <option value="network">Rede comunitária</option>
          <option value="other">Outra forma coletiva</option>
        </select>
      </label>
      <label className="grid gap-2 font-black">Apresentação pública
        <textarea className="min-h-36 border-2 border-comun-black bg-white p-3 font-normal" name="presentation" defaultValue={onboarding.presentation ?? ""} minLength={10} maxLength={1200} required aria-describedby="presentation-help" />
      </label>
      <p id="presentation-help" className="text-sm">Conte, de forma simples, o que a organização faz. Não inclua dados pessoais.</p>
      <label className="grid gap-2 font-black">Território de atuação, se quiser informar
        <input className="min-h-12 border-2 border-comun-black bg-white px-3 font-normal" name="service_territory" defaultValue={onboarding.serviceTerritory ?? ""} maxLength={300} />
      </label>
      <details className="border-t border-comun-black/30 pt-4">
        <summary className="min-h-11 cursor-pointer font-black">Contato e fonte pública opcionais</summary>
        <div className="mt-3 grid gap-4">
          <label className="grid gap-2 font-black">Contato que pode ser publicado
            <input className="min-h-12 border-2 border-comun-black bg-white px-3 font-normal" name="public_contact" defaultValue={onboarding.publicContactCandidate ?? ""} maxLength={300} />
          </label>
          <label className="flex min-h-11 items-start gap-3 text-sm font-bold">
            <input className="mt-1" type="checkbox" name="contact_authorized" value="yes" defaultChecked={onboarding.publicContactPublicationAuthorized} />
            Autorizo a publicação deste contato na ficha da organização.
          </label>
          <label className="grid gap-2 font-black">Fonte pública sobre a organização
            <input className="min-h-12 border-2 border-comun-black bg-white px-3 font-normal" name="public_source_url" type="url" inputMode="url" placeholder="https://…" defaultValue={onboarding.publicSourceUrlCandidate ?? ""} maxLength={1000} />
          </label>
        </div>
      </details>
      <label className="grid gap-2 font-black">Como você participa desta organização?
        <textarea className="min-h-28 border-2 border-comun-black bg-white p-3 font-normal" name="participation_note" defaultValue={onboarding.participationNotePrivate ?? ""} minLength={10} maxLength={600} required aria-describedby="participation-note-help" />
      </label>
      <p id="participation-note-help" className="text-sm">Esta resposta é privada e serve apenas para a verificação do vínculo.</p>
      <input className="hidden" name="company_website" tabIndex={-1} autoComplete="off" />
      {state.state === "error" ? <p ref={errorRef} tabIndex={-1} role="alert" className="border-l-4 border-red-700 pl-3 font-bold">{state.message}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button name="intent" value="submit" disabled={pending} className="min-h-12 border-2 border-comun-black bg-comun-yellow px-5 font-black disabled:opacity-60">{pending ? "Salvando…" : "Enviar para verificação"}</button>
        <button name="intent" value="save" disabled={pending} className="min-h-12 border-2 border-comun-black bg-white px-5 font-black disabled:opacity-60">Salvar rascunho</button>
      </div>
    </form>
  );
}

export function SolidarityOrganizationOnboardingWithdrawForm({
  action,
  continuationToken,
}: {
  action: Action;
  continuationToken: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialSolidarityOnboardingActionState);
  const [requestId] = useState(() => globalThis.crypto.randomUUID());
  const router = useRouter();
  useEffect(() => {
    if (state.state === "success") {
      router.push(state.href);
      router.refresh();
    }
    if (state.state === "auth_required") router.push(state.loginHref);
  }, [router, state]);
  return <form action={formAction} className="mt-5">
    <input type="hidden" name="request_id" value={requestId} />
    <input type="hidden" name="continuation_token" value={continuationToken} />
    <button disabled={pending} className="min-h-11 font-black underline disabled:opacity-60">{pending ? "Retirando…" : "Retirar este pedido"}</button>
    {state.state === "error" ? <p role="alert" className="mt-2 text-sm font-bold">{state.message}</p> : null}
  </form>;
}
