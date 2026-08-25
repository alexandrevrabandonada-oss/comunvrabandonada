"use client";

import { useCallback, useEffect, useState } from "react";
import { resolveDenunciasFollowup } from "@/lib/comun-denuncias-followup";
import { ComunFollowupSummary } from "./comun-followup-summary";

type Attempt = {
  attemptId: string;
  state: string;
  channel: string;
  sequence: number;
  dueAt?: string | null;
  declaredAt?: string | null;
  institutionalChannelId?: string | null;
  resolutionOutcome?: "resolved" | "unresolved" | null;
  officialProtocolMasked?: string | null;
};

type ForwardingPackage = {
  package_id: string;
  state: string;
  category: string;
  subject: string;
  institutional_text: string;
  response_expectation: string;
  attempts: Attempt[];
};

type Channel = {
  id: string;
  institution: string;
  channelType: "phone" | "web";
  label: string;
  sourceUrl: string;
  sourceStatus: string;
  operationalStatus: string;
  identificationRequirement: string;
  protocolExpectation: string;
  notes: string;
};

export function ComunEssentialServicesPanel({
  walletItemId,
}: {
  walletItemId: string;
}) {
  const [value, setValue] = useState<ForwardingPackage | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [protocol, setProtocol] = useState("");
  const [resolved, setResolved] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch(
      `/api/comun/essential-services/packages/${walletItemId}`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    const body = (await response.json()) as {
      packages?: ForwardingPackage[];
      channels?: Channel[];
    };
    setValue(body.packages?.[0] ?? null);
    setChannels(body.channels ?? []);
  }, [walletItemId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function prepare() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/comun/essential-services/packages/${walletItemId}/prepare`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("prepare_failed");
      await refresh();
      setNotice("Encaminhamento preparado. Nada foi enviado.");
    } catch {
      setNotice("Não foi possível preparar o encaminhamento agora.");
    } finally {
      setBusy(false);
    }
  }

  async function openChannel(channel: Channel) {
    if (!value) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/comun/essential-services/packages/${walletItemId}/${value.package_id}/open`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ channelId: channel.id }),
        },
      );
      if (!response.ok) throw new Error("open_failed");
      const body = (await response.json()) as { destination?: string };
      await refresh();
      if (body.destination) {
        window.open(body.destination, "_blank", "noopener,noreferrer");
      }
      setNotice(
        "O canal foi aberto por você. O encaminhamento continua preparado, não enviado.",
      );
    } catch {
      setNotice("Não foi possível abrir esse canal agora.");
    } finally {
      setBusy(false);
    }
  }

  async function declare(attemptId: string, sent: boolean) {
    setBusy(true);
    const response = await fetch(
      `/api/comun/essential-services/attempts/${attemptId}/declare-sent`,
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
    await refresh();
    setBusy(false);
  }

  async function recordResponse(attemptId: string) {
    if (!note.trim()) return;
    setBusy(true);
    const response = await fetch(
      `/api/comun/essential-services/attempts/${attemptId}/response`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          note,
          officialProtocol: protocol,
          resolved,
        }),
      },
    );
    setNotice(
      response.ok
        ? "Resposta registrada."
        : "Não foi possível registrar a resposta.",
    );
    if (response.ok) {
      setNote("");
      setProtocol("");
      setResolved(false);
      await refresh();
    }
    setBusy(false);
  }

  if (!value) {
    return (
      <section className="mt-3 grid gap-2 border-t-2 pt-3">
        <p className="font-black">Quer tentar resolver agora?</p>
        <p className="text-sm">
          O COMUN prepara o encaminhamento. Você confere, abre o canal e decide
          se quer enviar.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={prepare}
          className="min-h-11 w-fit border-2 bg-comun-yellow px-3 font-black"
        >
          Preparar encaminhamento
        </button>
        {notice ? <p role="status">{notice}</p> : null}
      </section>
    );
  }

  const prepared =
    value.attempts?.filter((item) => item.state === "prepared") ?? [];
  const sent =
    value.attempts?.filter((item) =>
      ["person_declared_sent", "responded", "no_response"].includes(item.state),
    ) ?? [];
  const latestAttempt = [...value.attempts].sort(
    (a, b) => b.sequence - a.sequence,
  )[0];
  const followup = resolveDenunciasFollowup({
    category: value.category,
    attempts: value.attempts,
    selectedChannels: channels.map((channel) => ({
      id: channel.id,
      label: channel.label,
      sourceStatus: channel.sourceStatus,
      operationalStatus: channel.operationalStatus,
      protocolExpectation: channel.protocolExpectation as
        "expected" | "source_unclear",
    })),
    now: new Date(),
    officialDeadlineAt: null,
    officialDeadlineSourceValid: false,
  });

  return (
    <section
      className="mt-3 grid gap-3 border-t-2 pt-3"
      data-comun-essential-assisted="true"
    >
      <header>
        <p className="font-black">Encaminhamento preparado</p>
        <p className="text-sm">
          Nada foi enviado. Somente você pode abrir o canal institucional e
          concluir a solicitação.
        </p>
      </header>
      {latestAttempt ? <ComunFollowupSummary projection={followup} /> : null}
      <div className="grid gap-2 border-2 bg-[#f8f2e6] p-3">
        <b>Mensagem preparada</b>
        <pre className="whitespace-pre-wrap text-sm">
          {value.institutional_text}
        </pre>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard?.writeText(value.institutional_text)
          }
          className="min-h-11 w-fit font-black underline"
        >
          Copiar mensagem
        </button>
        <p className="text-sm font-bold">
          Informe o local ao serviço para concluir a solicitação.
        </p>
        <p className="text-sm">
          Este dado é solicitado pelo serviço. Você não precisa fornecê-lo ao
          COMUN.
        </p>
      </div>
      <div className="grid gap-2">
        {channels.map((channel) => (
          <div key={channel.id} className="grid gap-1 border-2 p-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => openChannel(channel)}
              className="btn w-fit bg-comun-yellow"
            >
              {channel.label}
            </button>
            <p className="text-xs">
              Fonte oficial verificada; funcionamento não testado pelo COMUN.{" "}
              {channel.notes}
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
      </div>
      {prepared.map((attempt) => (
        <div key={attempt.attemptId} className="grid gap-2 border-2 p-3">
          <p className="font-black">Você conseguiu enviar?</p>
          <p className="text-sm">
            Abertura registrada como preparada, nunca como enviada.
          </p>
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
            Protocolo COMUN e protocolo do serviço são registros diferentes.
          </p>
          {attempt.officialProtocolMasked ? (
            <p className="font-mono text-sm">
              Protocolo do serviço informado: {attempt.officialProtocolMasked}
            </p>
          ) : null}
          {attempt.state !== "responded" ? (
            <div className="grid gap-2">
              <label className="grid gap-1 text-sm font-bold">
                Resposta recebida
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={600}
                  className="border-2 p-2 font-normal"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                Protocolo do serviço (opcional e não verificado)
                <input
                  value={protocol}
                  onChange={(event) => setProtocol(event.target.value)}
                  maxLength={240}
                  className="border-2 p-2 font-normal"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                A resposta resolveu o problema?
                <select
                  value={resolved ? "resolved" : "unresolved"}
                  onChange={(event) =>
                    setResolved(event.target.value === "resolved")
                  }
                  className="min-h-11 border-2 p-2 font-normal"
                >
                  <option value="unresolved">Não, ainda não resolveu</option>
                  <option value="resolved">Sim, resolveu</option>
                </select>
              </label>
              <button
                type="button"
                disabled={busy || !note.trim()}
                onClick={() => recordResponse(attempt.attemptId)}
                className="btn w-fit"
              >
                Registrar resposta
              </button>
            </div>
          ) : null}
        </div>
      ))}
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
