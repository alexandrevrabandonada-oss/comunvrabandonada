"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  initialSolidarityEconomicActionState,
  type SolidarityEconomicActionState,
} from "@/lib/comun-solidarity-economic-content";

type Action = (
  previous: SolidarityEconomicActionState,
  formData: FormData,
) => Promise<SolidarityEconomicActionState>;

type OfferInitial = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  kind: string;
  modalities: string[];
  priceAmountCents: number | null;
  priceNote: string | null;
  availability: string | null;
};

type NeedInitial = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  needType: string;
  dueAt: string | null;
};

const modalities = [
  ["sale", "Venda"], ["exchange", "Troca"], ["donation", "Doação"],
  ["loan", "Empréstimo"], ["cession", "Cessão"],
  ["mutual_aid", "Ajuda mútua"], ["cooperation", "Cooperação"], ["other", "Outra"],
] as const;

export function SolidarityOfferForm({ action, organization, initial }: {
  action: Action;
  organization: { slug: string; territoryId: string; publicName: string };
  initial?: OfferInitial;
}) {
  return <EconomicFormShell
    action={action}
    draftKey={`comun:a3:offer:${organization.territoryId}:${initial?.id ?? "new"}`}
    organization={organization}
    entityId={initial?.id}
    entitySlug={initial?.slug}
    entityName="offer_id"
  >
    <fieldset className="grid gap-5">
      <legend className="text-2xl font-black">O que vocês podem oferecer?</legend>
      <label className="grid gap-2 font-bold">Título
        <input className="min-h-12 border-2 border-comun-black bg-white px-3 font-normal" name="title" defaultValue={initial?.title} minLength={3} maxLength={140} required />
      </label>
      <label className="grid gap-2 font-bold">Explique de forma pública
        <textarea className="min-h-36 border-2 border-comun-black bg-white p-3 font-normal" name="public_summary" defaultValue={initial?.summary} minLength={10} maxLength={1200} required />
      </label>
      <fieldset className="grid gap-2">
        <legend className="font-bold">Como pode circular?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {modalities.map(([value, label]) => <label className="flex min-h-11 items-center gap-2" key={value}><input type="checkbox" name="modalities" value={value} defaultChecked={initial?.modalities.includes(value)} /> {label}</label>)}
        </div>
      </fieldset>
      <details className="border-t border-comun-black/30 pt-4">
        <summary className="min-h-11 cursor-pointer font-black">Acrescentar detalhes opcionais</summary>
        <div className="mt-3 grid gap-4">
          <label className="grid gap-2 font-bold">Tipo
            <select className="min-h-12 border-2 border-comun-black bg-white px-3 font-normal" name="offer_kind" defaultValue={initial?.kind ?? "other"}>
              <option value="other">Outro</option><option value="good">Bem</option><option value="service">Serviço</option><option value="resource">Recurso</option><option value="space">Espaço</option><option value="skill">Habilidade</option><option value="support">Apoio</option>
            </select>
          </label>
          <label className="grid gap-2 font-bold">Preço em reais, se houver
            <input className="min-h-12 border-2 border-comun-black bg-white px-3 font-normal" name="price" inputMode="decimal" placeholder="Ex.: 25,00" defaultValue={initial?.priceAmountCents ? (initial.priceAmountCents / 100).toFixed(2).replace(".", ",") : ""} />
          </label>
          <label className="grid gap-2 font-bold">Observação sobre valor
            <input className="min-h-12 border-2 border-comun-black bg-white px-3 font-normal" name="price_note" maxLength={300} defaultValue={initial?.priceNote ?? ""} placeholder="Ex.: valor a combinar" />
          </label>
          <label className="grid gap-2 font-bold">Disponibilidade
            <input className="min-h-12 border-2 border-comun-black bg-white px-3 font-normal" name="availability" maxLength={500} defaultValue={initial?.availability ?? ""} placeholder="Ex.: sob encomenda" />
          </label>
          {!initial ? <label className="grid gap-2 font-bold">Validade em dias
            <input className="min-h-12 border-2 border-comun-black bg-white px-3 font-normal" name="validity_days" type="number" min={1} max={180} defaultValue={30} />
          </label> : null}
        </div>
      </details>
    </fieldset>
    <input type="hidden" name="operation" value={initial ? "edit" : "create"} />
    <button className="min-h-12 justify-self-start border-2 border-comun-black bg-comun-yellow px-5 font-black">{initial ? "Salvar alterações" : "Publicar oferta"}</button>
  </EconomicFormShell>;
}

export function SolidarityNeedForm({ action, organization, initial }: {
  action: Action;
  organization: { slug: string; territoryId: string; publicName: string };
  initial?: NeedInitial;
}) {
  return <EconomicFormShell
    action={action}
    draftKey={`comun:a3:need:${organization.territoryId}:${initial?.id ?? "new"}`}
    organization={organization}
    entityId={initial?.id}
    entitySlug={initial?.slug}
    entityName="need_id"
  >
    <fieldset className="grid gap-5">
      <legend className="text-2xl font-black">Do que esta organização precisa?</legend>
      <label className="grid gap-2 font-bold">Título
        <input className="min-h-12 border-2 border-comun-black bg-white px-3 font-normal" name="title" defaultValue={initial?.title} minLength={3} maxLength={160} required />
      </label>
      <label className="grid gap-2 font-bold">Explique de forma pública
        <textarea className="min-h-36 border-2 border-comun-black bg-white p-3 font-normal" name="public_summary" defaultValue={initial?.summary} minLength={10} maxLength={1200} required />
      </label>
      <details className="border-t border-comun-black/30 pt-4">
        <summary className="min-h-11 cursor-pointer font-black">Acrescentar detalhes opcionais</summary>
        <div className="mt-3 grid gap-4">
          <label className="grid gap-2 font-bold">Tipo
            <select className="min-h-12 border-2 border-comun-black bg-white px-3 font-normal" name="need_type" defaultValue={initial?.needType ?? "other"}>
              <option value="other">Outro</option><option value="equipment">Equipamento</option><option value="vehicle">Veículo</option><option value="space">Espaço</option><option value="input">Insumo</option><option value="training">Formação</option><option value="technical_support">Apoio técnico</option><option value="partnership">Parceria</option><option value="volunteering">Pessoas voluntárias</option><option value="donation">Doação</option><option value="hiring">Contratação</option><option value="infrastructure">Infraestrutura</option><option value="communication">Comunicação</option>
            </select>
          </label>
          <label className="grid gap-2 font-bold">Data desejada, se houver
            <input className="min-h-12 border-2 border-comun-black bg-white px-3 font-normal" name="due_at" type="date" defaultValue={initial?.dueAt?.slice(0, 10) ?? ""} />
          </label>
        </div>
      </details>
    </fieldset>
    <input type="hidden" name="operation" value={initial ? "edit" : "create"} />
    <button className="min-h-12 justify-self-start border-2 border-comun-black bg-comun-yellow px-5 font-black">{initial ? "Salvar alterações" : "Publicar necessidade"}</button>
  </EconomicFormShell>;
}

export function SolidarityEconomicTransitionForm({ action, organization, entity, operation, label, validityDays }: {
  action: Action;
  organization: { slug: string; territoryId: string };
  entity: { kind: "offer" | "need"; id: string };
  operation: string;
  label: string;
  validityDays?: number;
}) {
  const [state, formAction, pending] = useActionState(action, initialSolidarityEconomicActionState);
  const [requestId] = useState(() => globalThis.crypto.randomUUID());
  const router = useRouter();
  useEffect(() => {
    if (state.state !== "success") return;
    router.push(state.href);
    router.refresh();
  }, [router, state]);
  const entityName = entity.kind === "offer" ? "offer_id" : "need_id";
  return <form action={formAction} className="inline-grid gap-1">
    <input type="hidden" name="request_id" value={requestId} />
    <input type="hidden" name="organization_slug" value={organization.slug} />
    <input type="hidden" name="organization_territory_id" value={organization.territoryId} />
    <input type="hidden" name="return_to" value={`/comun/cooperativas/${organization.slug}`} />
    <input type="hidden" name={entityName} value={entity.id} />
    <input type="hidden" name="operation" value={operation} />
    {validityDays ? <input type="hidden" name="validity_days" value={validityDays} /> : null}
    <button disabled={pending} className="min-h-11 border-2 border-comun-black bg-white px-3 font-black disabled:opacity-60">{pending ? "Salvando…" : label}</button>
    {state.state === "error" ? <span role="alert" className="max-w-xs text-xs font-bold">{state.message}</span> : null}
    {state.state === "auth_required" ? <Link className="text-sm underline" href={state.loginHref}>Entrar novamente</Link> : null}
  </form>;
}

function EconomicFormShell({ action, draftKey, organization, entityId, entitySlug, entityName, children }: {
  action: Action;
  draftKey: string;
  organization: { slug: string; territoryId: string; publicName: string };
  entityId?: string;
  entitySlug?: string;
  entityName: "offer_id" | "need_id";
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, initialSolidarityEconomicActionState);
  const [requestId] = useState(() => globalThis.crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    const form = formRef.current;
    const saved = sessionStorage.getItem(draftKey);
    if (!form || !saved) return;
    try {
      const fields = JSON.parse(saved) as Record<string, string | string[]>;
      for (const [name, raw] of Object.entries(fields)) {
        const elements = form.elements.namedItem(name);
        if (!elements) continue;
        const values = Array.isArray(raw) ? raw : [raw];
        if (elements instanceof RadioNodeList) {
          Array.from(elements).forEach((element) => {
            if (element instanceof HTMLInputElement && element.type === "checkbox") element.checked = values.includes(element.value);
          });
        } else if (elements instanceof HTMLInputElement || elements instanceof HTMLTextAreaElement || elements instanceof HTMLSelectElement) {
          elements.value = values[0] ?? "";
        }
      }
    } catch { sessionStorage.removeItem(draftKey); }
  }, [draftKey]);
  useEffect(() => {
    if (state.state !== "success") return;
    sessionStorage.removeItem(draftKey);
    router.push(state.href);
    router.refresh();
  }, [draftKey, router, state]);
  function preserveDraft() {
    const form = formRef.current;
    if (!form) return;
    const saved: Record<string, string | string[]> = {};
    for (const [key, value] of new FormData(form).entries()) {
      if (["request_id", "organization_slug", "organization_territory_id", "return_to", entityName, "company_website"].includes(key)) continue;
      if (key in saved) saved[key] = [...(Array.isArray(saved[key]) ? saved[key] : [saved[key] as string]), String(value)];
      else saved[key] = String(value);
    }
    sessionStorage.setItem(draftKey, JSON.stringify(saved));
  }
  const returnTo = `/comun/cooperativas/${organization.slug}/${entityName === "offer_id" ? "ofertas" : "necessidades"}/${entityId ? `${entitySlug}/editar` : "nova"}`;
  return <form ref={formRef} action={formAction} onInput={preserveDraft} className="grid gap-6" aria-busy={pending}>
    <input type="hidden" name="request_id" value={requestId} />
    <input type="hidden" name="organization_slug" value={organization.slug} />
    <input type="hidden" name="organization_territory_id" value={organization.territoryId} />
    <input type="hidden" name="return_to" value={returnTo} />
    {entityId ? <input type="hidden" name={entityName} value={entityId} /> : null}
    <label className="absolute left-[-10000px]" aria-hidden="true">Site da empresa<input name="company_website" tabIndex={-1} autoComplete="off" /></label>
    <p className="border-l-4 border-comun-black pl-3 text-sm">A organização é responsável por este conteúdo. Seu acesso é revogável e não transforma você em dono, vendedor ou responsável individual.</p>
    {children}
    {state.state === "error" ? <p role="alert" className="border-2 border-comun-black bg-white p-3 font-bold">{state.message}</p> : null}
    {state.state === "auth_required" ? <p role="alert" className="border-2 border-comun-black bg-white p-3"><span className="block font-bold">{state.message}</span><Link className="mt-3 inline-flex min-h-11 items-center underline" href={state.loginHref}>Entrar novamente</Link></p> : null}
    {pending ? <p role="status">Salvando…</p> : null}
  </form>;
}
