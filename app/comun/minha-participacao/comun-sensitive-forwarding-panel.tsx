"use client";

import { useCallback, useEffect, useState } from "react";
import type { SensitiveDisclosurePreview } from "@/lib/comun-sensitive-disclosure";
import type {
  SensitiveDisclosureInput,
  SensitiveForwardingCategory,
} from "@/lib/comun-sensitive-forwarding-feature";
import { resolveDenunciasFollowup } from "@/lib/comun-denuncias-followup";
import { ComunFollowupSummary } from "./comun-followup-summary";

type Attempt = {
  attemptId: string;
  state: string;
  channel: string;
  sequence: number;
  declaredAt?: string | null;
  institutionalChannelId?: string | null;
  resolutionOutcome?: "resolved" | "unresolved" | null;
  officialProtocolMasked?: string | null;
};
type Package = {
  package_id: string;
  state: string;
  category: SensitiveForwardingCategory;
  policy_identifier: string;
  institutional_text: string;
  attempts: Attempt[];
};
type Channel = {
  id: string;
  institution: string;
  channelType: "web" | "phone";
  sourceUrls: string[];
  notes: string;
  emergencyOnly: boolean;
};

const EMPTY_DISCLOSURE: SensitiveDisclosureInput = {
  includeIssueType: false,
  includeUnitLabel: false,
  unitLabel: "",
  includeNetworkLabel: false,
  networkLabel: "",
  includeApproximatePeriod: false,
  approximatePeriod: "",
  includePersonAuthoredSummary: false,
  personAuthoredSummary: "",
};

export function ComunSensitiveForwardingPanel({
  walletItemId,
  category,
}: {
  walletItemId: string;
  category: SensitiveForwardingCategory;
}) {
  const [pkg, setPackage] = useState<Package | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [issueLabel, setIssueLabel] = useState<string | null>(null);
  const [channelOnly, setChannelOnly] = useState(
    category === "child_protection",
  );
  const [disclosure, setDisclosure] =
    useState<SensitiveDisclosureInput>(EMPTY_DISCLOSURE);
  const [preview, setPreview] = useState<SensitiveDisclosurePreview | null>(
    null,
  );
  const [authorizationProof, setAuthorizationProof] = useState<string | null>(
    null,
  );
  const [authorizationExpiresAt, setAuthorizationExpiresAt] = useState<
    string | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [responseNote, setResponseNote] = useState("");
  const [officialProtocol, setOfficialProtocol] = useState("");
  const [outcome, setOutcome] = useState("return_received");
  const [retired, setRetired] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch(
      `/api/comun/sensitive-forwarding/packages/${walletItemId}`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    const value = (await response.json()) as {
      packages?: Package[];
      channels?: Channel[];
      issueLabel?: string | null;
      channelOnly?: boolean;
    };
    setPackage(value.packages?.[0] ?? null);
    setChannels(value.channels ?? []);
    setIssueLabel(value.issueLabel ?? null);
    setChannelOnly(value.channelOnly === true);
  }, [walletItemId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  function update<K extends keyof SensitiveDisclosureInput>(
    key: K,
    value: SensitiveDisclosureInput[K],
  ) {
    setPreview(null);
    setAuthorizationProof(null);
    setAuthorizationExpiresAt(null);
    setDisclosure((current) => ({ ...current, [key]: value }));
  }

  async function createPreview() {
    setBusy(true);
    setNotice(null);
    const response = await fetch(
      `/api/comun/sensitive-forwarding/packages/${walletItemId}/preview`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(disclosure),
      },
    );
    const value = (await response.json()) as {
      preview?: SensitiveDisclosurePreview;
      code?: string;
      authorizationProof?: string;
      authorizationExpiresAt?: string;
    };
    if (
      response.ok &&
      value.preview &&
      value.authorizationProof &&
      value.authorizationExpiresAt
    ) {
      setPreview(value.preview);
      setAuthorizationProof(value.authorizationProof);
      setAuthorizationExpiresAt(value.authorizationExpiresAt);
    } else if (value.code === "review_sensitive_information")
      setNotice(
        "Revise a mensagem: ela parece conter documento, contato ou outro identificador sensível.",
      );
    else setNotice("Revise os campos escolhidos antes de continuar.");
    setBusy(false);
  }

  async function prepare() {
    if (!preview || !authorizationProof || !authorizationExpiresAt) return;
    setBusy(true);
    const response = await fetch(
      `/api/comun/sensitive-forwarding/packages/${walletItemId}/prepare`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...disclosure,
          authorizationConfirmed: true,
          authorizationProof,
          authorizationExpiresAt,
        }),
      },
    );
    setNotice(
      response.ok
        ? "Encaminhamento preparado. Nada foi enviado."
        : "Não foi possível preparar este encaminhamento.",
    );
    if (response.ok) await refresh();
    setBusy(false);
  }

  async function openChannel(channel: Channel) {
    if (!pkg) return;
    setBusy(true);
    const response = await fetch(
      `/api/comun/sensitive-forwarding/packages/${walletItemId}/${pkg.package_id}/open`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channelId: channel.id }),
      },
    );
    const value = (await response.json()) as { destination?: string };
    if (response.ok && value.destination) {
      window.open(value.destination, "_blank", "noopener,noreferrer");
      setNotice(
        "Canal aberto por você. O estado continua preparado, não enviado.",
      );
      await refresh();
    } else setNotice("Este canal não está disponível agora.");
    setBusy(false);
  }

  async function declare(attemptId: string, sent: boolean) {
    setBusy(true);
    const response = await fetch(
      `/api/comun/sensitive-forwarding/attempts/${attemptId}/declare-sent`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sent }),
      },
    );
    setNotice(
      response.ok
        ? sent
          ? "Envio registrado conforme a sua declaração."
          : "Tudo bem. Nada foi marcado como enviado."
        : "Não foi possível registrar sua escolha.",
    );
    if (response.ok) await refresh();
    setBusy(false);
  }

  async function recordResponse(attemptId: string) {
    setBusy(true);
    const response = await fetch(
      `/api/comun/sensitive-forwarding/attempts/${attemptId}/response`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          outcome,
          note: channelOnly ? "" : responseNote,
          officialProtocol,
        }),
      },
    );
    setNotice(
      response.ok
        ? "Andamento registrado."
        : "Não foi possível registrar sem uma nova revisão.",
    );
    if (response.ok) {
      setResponseNote("");
      setOfficialProtocol("");
      await refresh();
    }
    setBusy(false);
  }

  async function withdraw() {
    if (!pkg) return;
    setBusy(true);
    const response = await fetch(
      `/api/comun/sensitive-forwarding/packages/${pkg.package_id}/withdraw`,
      { method: "POST" },
    );
    setNotice(
      response.ok
        ? "Encaminhamento retirado e conteúdo aprovado removido."
        : "Não foi possível retirar agora.",
    );
    if (response.ok) {
      setPackage(null);
      setRetired(true);
    }
    setBusy(false);
  }

  if (retired) {
    return (
      <p className="mt-3 border-l-4 border-comun-yellow pl-3 text-sm font-bold">
        Encaminhamento retirado. O conteúdo aprovado foi removido.
      </p>
    );
  }

  if (!pkg) {
    return (
      <section
        className="mt-3 grid gap-3 border-t-2 pt-3"
        data-comun-sensitive-forwarding="review"
      >
        <header>
          <p className="font-black">
            {channelOnly
              ? "Canais de proteção disponíveis"
              : "Quer abrir um canal oficial?"}
          </p>
          <p className="text-sm">
            {channelOnly
              ? "O COMUN não leva nenhum conteúdo da situação. Você comunica diretamente ao canal escolhido."
              : "Escolha somente as informações que você quer levar. Nada está marcado por padrão."}
          </p>
        </header>
        {!channelOnly ? (
          <fieldset className="grid gap-3 border-2 bg-white p-3">
            <legend className="px-1 font-black">
              O que você quer levar para este canal?
            </legend>
            {issueLabel ? (
              <Check
                checked={disclosure.includeIssueType}
                onChange={(value) => update("includeIssueType", value)}
                label={`Tipo do problema: ${issueLabel}`}
              />
            ) : null}
            <DisclosureField
              label={
                category === "public_health"
                  ? "Nome da unidade"
                  : "Escola ou unidade"
              }
              checked={disclosure.includeUnitLabel}
              value={disclosure.unitLabel}
              maxLength={120}
              onChecked={(value) => update("includeUnitLabel", value)}
              onValue={(value) => update("unitLabel", value)}
            />
            {category === "public_education" ? (
              <DisclosureField
                label="Rede municipal ou estadual"
                checked={disclosure.includeNetworkLabel}
                value={disclosure.networkLabel}
                maxLength={40}
                onChecked={(value) => update("includeNetworkLabel", value)}
                onValue={(value) => update("networkLabel", value)}
              />
            ) : null}
            <DisclosureField
              label="Período aproximado"
              checked={disclosure.includeApproximatePeriod}
              value={disclosure.approximatePeriod}
              maxLength={80}
              onChecked={(value) => update("includeApproximatePeriod", value)}
              onValue={(value) => update("approximatePeriod", value)}
            />
            <label className="grid gap-2 font-bold">
              <Check
                checked={disclosure.includePersonAuthoredSummary}
                onChange={(value) =>
                  update("includePersonAuthoredSummary", value)
                }
                label="Mensagem que você quer levar ao serviço"
              />
              <textarea
                value={disclosure.personAuthoredSummary}
                disabled={!disclosure.includePersonAuthoredSummary}
                onChange={(event) =>
                  update("personAuthoredSummary", event.target.value)
                }
                maxLength={1000}
                className="min-h-24 border-2 p-2 font-normal disabled:opacity-50"
                placeholder="Escreva uma mensagem nova. O relato original não será copiado."
              />
            </label>
          </fieldset>
        ) : null}
        {!preview ? (
          <button
            type="button"
            disabled={busy}
            onClick={createPreview}
            className="btn w-fit bg-comun-yellow"
          >
            Revisar antes de abrir o canal
          </button>
        ) : (
          <Preview value={preview} onConfirm={prepare} busy={busy} />
        )}
        {notice ? (
          <p
            role="status"
            className="border-l-4 border-comun-yellow pl-3 text-sm font-bold"
          >
            {notice}
          </p>
        ) : null}
      </section>
    );
  }

  const prepared =
    pkg.attempts?.filter((attempt) => attempt.state === "prepared") ?? [];
  const sent =
    pkg.attempts?.filter((attempt) =>
      ["person_declared_sent", "responded", "no_response"].includes(attempt.state),
    ) ?? [];
  const followup = resolveDenunciasFollowup({
    category,
    attempts: pkg.attempts,
    selectedChannels: channels.map((channel) => ({
      id: channel.id,
      label: channel.institution,
      sourceStatus: "source_verified",
      operationalStatus: "operationally_unchecked",
    })),
  });
  return (
    <section
      className="mt-3 grid gap-3 border-t-2 pt-3"
      data-comun-sensitive-forwarding={channelOnly ? "channel-only" : "minimal"}
    >
      <header>
        <p className="font-black">Encaminhamento preparado</p>
        <p className="text-sm">
          Nada foi enviado. Somente você pode abrir o canal e concluir a
          manifestação.
        </p>
      </header>
      <ComunFollowupSummary projection={followup} />
      {!channelOnly ? (
        <div className="grid gap-2 border-2 bg-[#f8f2e6] p-3">
          <b>Mensagem aprovada por você</b>
          <pre className="whitespace-pre-wrap text-sm">
            {pkg.institutional_text}
          </pre>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard?.writeText(pkg.institutional_text)
            }
            className="min-h-11 w-fit font-black underline"
          >
            Copiar mensagem
          </button>
        </div>
      ) : (
        <p className="border-l-4 border-comun-yellow pl-3 text-sm font-bold">
          Nenhum conteúdo da situação será copiado pelo COMUN. Conte diretamente
          ao canal.
        </p>
      )}
      <div className="grid gap-2">
        {channels.map((channel) => (
          <article key={channel.id} className="grid gap-2 border-2 p-3">
            <b>{channel.institution}</b>
            <button
              type="button"
              disabled={busy}
              onClick={() => openChannel(channel)}
              className="btn w-fit bg-comun-yellow"
            >
              {channel.channelType === "phone"
                ? "Abrir telefone"
                : "Continuar para o canal"}
            </button>
            <p className="text-xs">
              Fonte oficial verificada; funcionamento não testado.{" "}
              {channel.notes}
            </p>
            {channel.sourceUrls.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="w-fit text-xs font-bold underline"
              >
                Consultar fonte oficial
              </a>
            ))}
          </article>
        ))}
      </div>
      {prepared.map((attempt) => (
        <div key={attempt.attemptId} className="grid gap-2 border-2 p-3">
          <p className="font-black">Você conseguiu enviar?</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => declare(attempt.attemptId, true)}
              className="btn bg-comun-yellow"
            >
              Sim, enviei
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => declare(attempt.attemptId, false)}
              className="btn"
            >
              Ainda não
            </button>
          </div>
        </div>
      ))}
      {sent.map((attempt) => (
        <div key={attempt.attemptId} className="grid gap-2 border-2 p-3">
          <label className="grid gap-1 text-sm font-bold">
            O que aconteceu depois?
            <select
              value={outcome}
              onChange={(event) => setOutcome(event.target.value)}
              className="min-h-11 border-2 p-2 font-normal"
            >
              <option value="return_received">Houve retorno</option>
              <option value="no_return">Não houve retorno</option>
              <option value="situation_forwarded">Situação encaminhada</option>
              <option value="prefer_not_to_record_details">
                Prefiro não registrar detalhes
              </option>
            </select>
          </label>
          {!channelOnly ? (
            <label className="grid gap-1 text-sm font-bold">
              Nota curta opcional
              <textarea
                value={responseNote}
                onChange={(event) => setResponseNote(event.target.value)}
                maxLength={280}
                className="border-2 p-2 font-normal"
              />
            </label>
          ) : null}
          <label className="grid gap-1 text-sm font-bold">
            Protocolo informado por você (opcional e não verificado)
            <input
              value={officialProtocol}
              onChange={(event) => setOfficialProtocol(event.target.value)}
              maxLength={240}
              className="border-2 p-2 font-normal"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => recordResponse(attempt.attemptId)}
            className="btn w-fit"
          >
            Registrar andamento
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={busy}
        onClick={withdraw}
        className="min-h-11 w-fit font-black underline"
      >
        Retirar encaminhamento e seu conteúdo
      </button>
      {notice ? (
        <p
          role="status"
          className="border-l-4 border-comun-yellow pl-3 text-sm font-bold"
        >
          {notice}
        </p>
      ) : null}
    </section>
  );
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 font-bold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5"
      />
      {label}
    </label>
  );
}

function DisclosureField({
  label,
  checked,
  value,
  maxLength,
  onChecked,
  onValue,
}: {
  label: string;
  checked: boolean;
  value: string;
  maxLength: number;
  onChecked: (value: boolean) => void;
  onValue: (value: string) => void;
}) {
  return (
    <div className="grid gap-1">
      <Check checked={checked} onChange={onChecked} label={label} />
      <input
        value={value}
        disabled={!checked}
        onChange={(event) => onValue(event.target.value)}
        maxLength={maxLength}
        className="min-h-11 border-2 p-2 disabled:opacity-50"
      />
    </div>
  );
}

function Preview({
  value,
  onConfirm,
  busy,
}: {
  value: SensitiveDisclosurePreview;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <section
      className="grid gap-3 border-2 bg-white p-3"
      aria-label="Revisão do compartilhamento"
    >
      <div>
        <p className="font-black">SERÁ COMPARTILHADO</p>
        <ul className="list-disc pl-5 text-sm">
          {value.sharedItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-black">NÃO SERÁ COMPARTILHADO</p>
        <ul className="list-disc pl-5 text-sm">
          {value.notSharedItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      {value.institutionalText ? (
        <pre className="whitespace-pre-wrap border-l-4 border-comun-yellow pl-3 text-sm">
          {value.institutionalText}
        </pre>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={onConfirm}
        className="btn w-fit bg-comun-yellow"
      >
        Continuar para o canal
      </button>
    </section>
  );
}
