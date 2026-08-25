"use client";

import { useCallback, useEffect, useState } from "react";

type Attempt = {
  attemptId: string;
  state: string;
  officialProtocolMasked?: string | null;
};

type Package = {
  package_id: string;
  state: string;
  subject: string;
  institutional_text: string;
  attempts: Attempt[];
};

type Channel = {
  id: string;
  institution: string;
  channelType: "phone" | "web";
  destination: string;
  sourceUrl: string;
  notes: string;
};

type Preview = {
  subject: string;
  publicReference: string;
  personAuthoredSummary: string;
  warning: string;
};

export function ComunCivicForwardingPanel({
  walletItemId,
}: {
  walletItemId: string;
}) {
  const [pkg, setPackage] = useState<Package | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [reference, setReference] = useState("");
  const [summary, setSummary] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [responseNote, setResponseNote] = useState("");
  const [officialProtocol, setOfficialProtocol] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch(
      `/api/comun/civic-forwarding/packages/${walletItemId}`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    const value = (await response.json()) as {
      packages?: Package[];
      channels?: Channel[];
    };
    setPackage(value.packages?.[0] ?? null);
    setChannels(value.channels ?? []);
  }, [walletItemId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function createPreview() {
    setBusy(true);
    setNotice(null);
    const response = await fetch(
      `/api/comun/civic-forwarding/packages/${walletItemId}/preview`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          publicReference: reference,
          personAuthoredSummary: summary,
        }),
      },
    );
    const value = (await response.json()) as {
      preview?: Preview;
      code?: string;
    };
    if (response.ok && value.preview) setPreview(value.preview);
    else
      setNotice(
        value.code === "private_data_not_allowed"
          ? "Retire contato, documento ou endereço exato. Use uma referência pública aproximada."
          : "Revise a referência pública e a mensagem antes de continuar.",
      );
    setBusy(false);
  }

  async function prepare() {
    if (!preview) return;
    setBusy(true);
    const response = await fetch(
      `/api/comun/civic-forwarding/packages/${walletItemId}/prepare`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          publicReference: reference,
          personAuthoredSummary: summary,
          previewConfirmed: true,
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
      `/api/comun/civic-forwarding/packages/${walletItemId}/${pkg.package_id}/open`,
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
      `/api/comun/civic-forwarding/attempts/${attemptId}/declare-sent`,
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
    if (!responseNote.trim()) return;
    setBusy(true);
    const response = await fetch(
      `/api/comun/civic-forwarding/attempts/${attemptId}/response`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          note: responseNote,
          officialProtocol,
          resolved: false,
        }),
      },
    );
    setNotice(
      response.ok
        ? "Resposta registrada."
        : "Não foi possível registrar a resposta.",
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
      `/api/comun/civic-forwarding/packages/${walletItemId}/${pkg.package_id}/withdraw`,
      { method: "POST" },
    );
    setNotice(
      response.ok
        ? "Encaminhamento retirado."
        : "Não foi possível retirar agora.",
    );
    if (response.ok) setPackage(null);
    setBusy(false);
  }

  if (!pkg) {
    return (
      <section
        className="mt-3 grid gap-3 border-t-2 pt-3"
        data-comun-civic-forwarding="review"
      >
        <header>
          <p className="font-black">O que será levado</p>
          <p className="text-sm">
            Use apenas uma referência pública aproximada e uma mensagem nova.
            Não inclua endereço residencial exato, contato ou documento.
          </p>
        </header>
        <label className="grid gap-1 text-sm font-bold">
          Referência pública aproximada
          <input
            value={reference}
            onChange={(event) => {
              setReference(event.target.value);
              setPreview(null);
            }}
            maxLength={160}
            className="min-h-11 border-2 p-2 font-normal"
            placeholder="Ex.: praça do bairro, esquina ou ponto público"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Mensagem para o serviço
          <textarea
            value={summary}
            onChange={(event) => {
              setSummary(event.target.value);
              setPreview(null);
            }}
            maxLength={1000}
            className="min-h-28 border-2 p-2 font-normal"
            placeholder="Descreva o problema de forma objetiva."
          />
        </label>
        {!preview ? (
          <button
            type="button"
            disabled={busy}
            onClick={createPreview}
            className="btn w-fit bg-comun-yellow"
          >
            Revisar antes de preparar
          </button>
        ) : (
          <div className="grid gap-2 border-2 bg-[#f8f2e6] p-3">
            <p className="font-black">Confirme o que será levado</p>
            <p className="font-bold">{preview.subject}</p>
            <p className="text-sm">
              <b>Referência:</b> {preview.publicReference}
            </p>
            <p className="whitespace-pre-wrap text-sm">
              <b>Mensagem:</b> {preview.personAuthoredSummary}
            </p>
            <p className="text-xs font-bold">{preview.warning}</p>
            <button
              type="button"
              disabled={busy}
              onClick={prepare}
              className="btn w-fit bg-comun-yellow"
            >
              Preparar encaminhamento
            </button>
          </div>
        )}
        {notice ? (
          <p role="status" className="text-sm font-bold">
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
      ["person_declared_sent", "responded", "no_response"].includes(
        attempt.state,
      ),
    ) ?? [];
  return (
    <section
      className="mt-3 grid gap-3 border-t-2 pt-3"
      data-comun-civic-forwarding="active"
    >
      <header>
        <p className="font-black">Encaminhamento preparado.</p>
        <p className="text-sm">
          Nada foi enviado ainda. Você decide se quer abrir o canal oficial.
        </p>
      </header>
      <div className="grid gap-2 border-2 bg-[#f8f2e6] p-3">
        <b>{pkg.subject}</b>
        <pre className="whitespace-pre-wrap text-sm">
          {pkg.institutional_text}
        </pre>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(pkg.institutional_text)}
          className="min-h-11 w-fit font-black underline"
        >
          Copiar mensagem
        </button>
      </div>
      {channels.map((channel) => (
        <div key={channel.id} className="grid gap-1 border-2 p-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => openChannel(channel)}
            className="btn w-fit bg-comun-yellow"
          >
            Continuar para o canal oficial
          </button>
          <p className="text-xs">
            {channel.institution} · fonte oficial verificada; funcionamento não
            testado pelo COMUN. {channel.notes}
          </p>
          <a
            href={channel.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="w-fit text-xs font-bold underline"
          >
            Consultar fonte oficial
          </a>
        </div>
      ))}
      {prepared.map((attempt) => (
        <div key={attempt.attemptId} className="grid gap-2 border-2 p-3">
          <p className="font-black">Você conseguiu enviar?</p>
          <p className="text-sm">Abrir ou copiar não significa enviar.</p>
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
          <p className="font-bold">
            {attempt.state === "responded"
              ? "Resposta registrada"
              : "Enviado por você"}
          </p>
          <p className="text-sm">
            Protocolo COMUN e protocolo do órgão são registros diferentes.
          </p>
          {attempt.officialProtocolMasked ? (
            <p className="font-mono text-sm">
              Protocolo do órgão: {attempt.officialProtocolMasked}
            </p>
          ) : null}
          {attempt.state !== "responded" ? (
            <>
              <textarea
                value={responseNote}
                onChange={(event) => setResponseNote(event.target.value)}
                maxLength={600}
                className="min-h-20 border-2 p-2"
                placeholder="Recebeu uma resposta?"
              />
              <input
                value={officialProtocol}
                onChange={(event) => setOfficialProtocol(event.target.value)}
                maxLength={240}
                className="min-h-11 border-2 p-2"
                placeholder="Protocolo do órgão (opcional)"
              />
              <button
                type="button"
                disabled={busy || !responseNote.trim()}
                onClick={() => recordResponse(attempt.attemptId)}
                className="btn w-fit"
              >
                Registrar resposta
              </button>
            </>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        disabled={busy}
        onClick={withdraw}
        className="w-fit text-sm font-bold underline"
      >
        Retirar encaminhamento
      </button>
      {notice ? (
        <p
          role="status"
          className="border-l-4 border-comun-yellow bg-white p-3 text-sm font-bold"
        >
          {notice}
        </p>
      ) : null}
    </section>
  );
}
