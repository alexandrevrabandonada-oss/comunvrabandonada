"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  initialSolidarityOrganizationProfileActionState,
  type SolidarityOrganizationProfileActionState,
} from "@/lib/comun-solidarity-organization-profile";

type ProfileAction = (
  previous: SolidarityOrganizationProfileActionState,
  formData: FormData,
) => Promise<SolidarityOrganizationProfileActionState>;

type OrganizationProfile = {
  territoryId: string;
  slug: string;
  publicName: string;
  organizationType: string;
  verificationStatus: string;
  presentation: string | null;
  services: readonly string[];
  serviceTerritory: string | null;
  publicContact: string | null;
};

export function SolidarityOrganizationProfileForm({
  action,
  organization,
  expectedUpdatedAt,
}: {
  action: ProfileAction;
  organization: OrganizationProfile;
  expectedUpdatedAt: string;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialSolidarityOrganizationProfileActionState,
  );
  const [requestId] = useState(() => globalThis.crypto.randomUUID());
  const [publicContact, setPublicContact] = useState(
    organization.publicContact ?? "",
  );
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const draftKey = `comun:a6:organization-profile:${organization.territoryId}`;
  const normalizedContact = publicContact.trim().replace(/\s+/g, " ");
  const contactNeedsConfirmation =
    normalizedContact.length > 0 &&
    normalizedContact !== (organization.publicContact ?? "");

  useEffect(() => {
    const form = formRef.current;
    const saved = sessionStorage.getItem(draftKey);
    if (!form || !saved) return;
    let restoredContact: string | null = null;
    try {
      const fields = JSON.parse(saved) as Record<string, string>;
      for (const [name, fieldValue] of Object.entries(fields)) {
        const element = form.elements.namedItem(name);
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement
        ) {
          element.value = fieldValue;
          if (name === "public_contact_authorized")
            restoredContact = fieldValue;
        }
      }
    } catch {
      sessionStorage.removeItem(draftKey);
    }
    if (restoredContact === null) return;
    const timer = window.setTimeout(
      () => setPublicContact(restoredContact ?? ""),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [draftKey]);

  useEffect(() => {
    if (state.state === "success") {
      sessionStorage.removeItem(draftKey);
      router.push(state.href);
      router.refresh();
      return;
    }
    if (state.state === "error" && state.field) {
      const field = formRef.current?.elements.namedItem(state.field);
      if (field instanceof HTMLElement) field.focus();
    }
  }, [draftKey, router, state]);

  function preserveDraft() {
    const form = formRef.current;
    if (!form) return;
    const fields: Record<string, string> = {};
    for (const name of [
      "presentation_public",
      "services_public",
      "service_territory_public",
      "public_contact_authorized",
    ]) {
      const element = form.elements.namedItem(name);
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement
      )
        fields[name] = element.value;
    }
    sessionStorage.setItem(draftKey, JSON.stringify(fields));
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={preserveDraft}
      className="grid gap-6"
      aria-busy={pending}
    >
      <input type="hidden" name="request_id" value={requestId} />
      <input
        type="hidden"
        name="organization_territory_id"
        value={organization.territoryId}
      />
      <input type="hidden" name="organization_slug" value={organization.slug} />
      <input
        type="hidden"
        name="expected_updated_at"
        value={expectedUpdatedAt}
      />
      <label className="absolute left-[-10000px]" aria-hidden="true">
        Site da empresa
        <input name="company_website" tabIndex={-1} autoComplete="off" />
      </label>

      <section className="border-2 border-comun-black bg-comun-paper p-4" aria-labelledby="protected-identity-title">
        <h2 id="protected-identity-title" className="text-lg font-black">
          Identidade pública
        </h2>
        <p className="mt-1 text-sm">
          Nome, tipo e verificação fazem parte da identidade pública da
          organização e não são alterados nesta tela.
        </p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div><dt className="font-black">Nome</dt><dd>{organization.publicName}</dd></div>
          <div><dt className="font-black">Tipo</dt><dd>{organization.organizationType}</dd></div>
          <div><dt className="font-black">Verificação</dt><dd>{organization.verificationStatus}</dd></div>
        </dl>
      </section>

      <label className="grid gap-2 font-bold">
        Apresentação
        <textarea
          className="min-h-36 border-2 border-comun-black bg-white p-3 font-normal"
          name="presentation_public"
          defaultValue={organization.presentation ?? ""}
          minLength={10}
          maxLength={1_200}
          aria-describedby="presentation-help"
        />
        <span id="presentation-help" className="text-sm font-normal">
          Opcional. Se preenchida, use entre 10 e 1.200 caracteres.
        </span>
      </label>

      <label className="grid gap-2 font-bold">
        O que fazemos
        <textarea
          className="min-h-36 border-2 border-comun-black bg-white p-3 font-normal"
          name="services_public"
          defaultValue={organization.services.join("\n")}
          aria-describedby="services-help"
        />
        <span id="services-help" className="text-sm font-normal">
          Um por linha. Até 12 itens, com 2 a 80 caracteres cada.
        </span>
      </label>

      <label className="grid gap-2 font-bold">
        Território de atuação
        <textarea
          className="min-h-24 border-2 border-comun-black bg-white p-3 font-normal"
          name="service_territory_public"
          defaultValue={organization.serviceTerritory ?? ""}
          maxLength={300}
          aria-describedby="service-territory-help"
        />
        <span id="service-territory-help" className="text-sm font-normal">
          Opcional. Descreva os lugares onde a organização atua; isso não cria
          uma localização ou coordenada.
        </span>
      </label>

      <div className="grid gap-3">
        <label className="grid gap-2 font-bold">
          Contato público
          <input
            className="min-h-12 border-2 border-comun-black bg-white px-3 font-normal"
            name="public_contact_authorized"
            value={publicContact}
            onChange={(event) => setPublicContact(event.target.value)}
            maxLength={200}
            aria-describedby="public-contact-help"
          />
        </label>
        <p id="public-contact-help" className="text-sm">
          Opcional. Este contato ficará visível publicamente na ficha. Pode ser
          telefone, WhatsApp, e-mail, rede social ou site público. Não use CPF,
          documento, senha ou endereço residencial.
        </p>
        {contactNeedsConfirmation ? (
          <label className="flex items-start gap-3 border-l-4 border-comun-yellow pl-3 text-sm font-bold">
            <input
              className="mt-1"
              type="checkbox"
              name="public_contact_confirmed"
              value="confirmed"
              required
            />
            Confirmo que este contato pode ser exibido publicamente na ficha
            desta organização no COMUN.
          </label>
        ) : null}
      </div>

      <button
        disabled={pending}
        className="min-h-12 justify-self-start border-2 border-comun-black bg-comun-yellow px-5 font-black disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar alterações"}
      </button>
      {state.state === "error" ? (
        <p role="alert" className="border-2 border-comun-black bg-white p-3 font-bold">
          {state.message}
        </p>
      ) : null}
      {state.state === "auth_required" ? (
        <p role="alert" className="border-2 border-comun-black bg-white p-3">
          <span className="block font-bold">{state.message}</span>
          <Link className="mt-3 inline-flex min-h-11 items-center underline" href={state.loginHref}>
            Entrar novamente
          </Link>
        </p>
      ) : null}
      {pending ? <p role="status">Salvando alterações…</p> : null}
    </form>
  );
}
