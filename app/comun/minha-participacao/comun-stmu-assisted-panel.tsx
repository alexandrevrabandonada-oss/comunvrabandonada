"use client";

import { useCallback, useEffect, useState } from "react";
import { resolveDenunciasFollowup } from "@/lib/comun-denuncias-followup";
import { ComunFollowupSummary } from "./comun-followup-summary";

type Attempt = {
  attemptId: string;
  sequence: number;
  channel: string;
  state: string;
  declaredAt?: string | null;
  dueAt?: string | null;
  resolutionOutcome?: "resolved" | "unresolved" | null;
  officialProtocolMasked?: string | null;
};
type Package = {
  package_id: string;
  state: string;
  subject: string;
  institutional_text: string;
  response_expectation: string;
  attempts: Attempt[];
};

const labels: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  phone: "Telefone",
  in_person: "Presencial",
};

export function ComunStmuAssistedPanel({
  walletItemId,
}: {
  walletItemId: string;
}) {
  const [value, setValue] = useState<Package | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [protocol, setProtocol] = useState("");
  const [resolved, setResolved] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch(
      `/api/comun/stmu-assisted/packages/${walletItemId}`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    const body = (await response.json()) as { packages?: Package[] };
    setValue(body.packages?.[0] ?? null);
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
        `/api/comun/stmu-assisted/packages/${walletItemId}/prepare`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error();
      await refresh();
      setNotice("Pacote preparado. Confira tudo antes de escolher um canal.");
    } catch {
      setNotice("Não foi possível preparar o encaminhamento agora.");
    } finally {
      setBusy(false);
    }
  }

  async function open(channel: string) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/comun/stmu-assisted/packages/${value?.package_id}/open`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ channel }),
        },
      );
      if (!response.ok) throw new Error();
      const body = (await response.json()) as { destination?: string | null };
      await refresh();
      if (body.destination)
        window.open(body.destination, "_blank", "noopener,noreferrer");
      setNotice(
        "O canal foi aberto por você. O COMUN ainda não registrou envio.",
      );
    } catch {
      setNotice("Não foi possível abrir esse canal.");
    } finally {
      setBusy(false);
    }
  }

  async function declare(attemptId: string, sent: boolean) {
    setBusy(true);
    const response = await fetch(
      `/api/comun/stmu-assisted/attempts/${attemptId}/declare-sent`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sent }),
      },
    );
    setNotice(
      response.ok
        ? sent
          ? "Envio registrado conforme sua declaração."
          : "Tentativa encerrada sem envio."
        : "Não foi possível registrar sua escolha.",
    );
    await refresh();
    setBusy(false);
  }

  async function recordResponse(attemptId: string) {
    if (!note.trim()) return;
    setBusy(true);
    const response = await fetch(
      `/api/comun/stmu-assisted/attempts/${attemptId}/response`,
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

  if (!value)
    return (
      <section className="mt-3 grid gap-2 border-t-2 pt-3">
        <p className="font-black">Encaminhar para a STMU</p>
        <p className="text-sm">
          O COMUN prepara as informações. Você continua responsável por conferir
          e enviar.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={prepare}
          className="min-h-11 w-fit border-2 bg-comun-yellow px-3 font-black"
        >
          Preparar encaminhamento
        </button>
        {notice ? (
          <p role="status" className="text-sm font-bold">
            {notice}
          </p>
        ) : null}
      </section>
    );

  const pending =
    value.attempts?.filter((item) => item.state === "prepared") ?? [];
  const sent =
    value.attempts?.filter((item) =>
      ["person_declared_sent", "responded", "no_response"].includes(item.state),
    ) ?? [];
  const followup = resolveDenunciasFollowup({
    category: "public_transport",
    attempts: value.attempts,
    officialDeadlineAt: null,
    officialDeadlineSourceValid: false,
  });
  return (
    <section
      className="mt-3 grid gap-3 border-t-2 pt-3"
      data-comun-stmu-assisted="true"
    >
      <header>
        <p className="font-black">Encaminhamento STMU assistido</p>
        <p className="text-sm">
          Confira, copie e envie manualmente. O COMUN não controla WhatsApp,
          e-mail ou telefone.
        </p>
      </header>
      <ComunFollowupSummary projection={followup} />
      <div className="grid gap-2 border-2 bg-[#f8f2e6] p-3">
        <b>Assunto</b>
        <p>{value.subject}</p>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(value.subject)}
          className="min-h-11 w-fit underline font-black"
        >
          Copiar assunto
        </button>
        <b>Mensagem preparada</b>
        <pre className="whitespace-pre-wrap text-sm">
          {value.institutional_text}
        </pre>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard?.writeText(value.institutional_text)
          }
          className="min-h-11 w-fit underline font-black"
        >
          Copiar mensagem
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => open("whatsapp")}
          className="btn"
        >
          Abrir WhatsApp da STMU
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => open("email")}
          className="btn"
        >
          Abrir cliente de e-mail
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => open("phone")}
          className="btn"
        >
          Ver telefone
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => open("in_person")}
          className="btn"
        >
          Registrar opção presencial
        </button>
      </div>
      {pending.map((attempt) => (
        <div key={attempt.attemptId} className="grid gap-2 border-2 p-3">
          <p className="font-bold">
            Tentativa {attempt.sequence} ·{" "}
            {labels[attempt.channel] ?? attempt.channel} · preparada, não
            enviada
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => declare(attempt.attemptId, true)}
              className="btn bg-comun-yellow"
            >
              Já enviei
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => declare(attempt.attemptId, false)}
              className="btn"
            >
              Não enviei
            </button>
          </div>
        </div>
      ))}
      {sent.map((attempt) => (
        <div key={attempt.attemptId} className="grid gap-2 border-2 p-3">
          <p className="font-bold">
            Tentativa {attempt.sequence} ·{" "}
            {labels[attempt.channel] ?? attempt.channel} ·{" "}
            {attempt.state === "responded"
              ? "resposta registrada"
              : "envio declarado por você"}
          </p>
          {attempt.dueAt ? (
            <p className="text-sm">
              Acompanhamento: {new Date(attempt.dueAt).toLocaleString("pt-BR")}.
              72 horas é uma referência de acompanhamento do COMUN, não prazo
              legal nem garantia de resposta.
            </p>
          ) : null}
          {attempt.officialProtocolMasked ? (
            <p className="font-mono text-sm">
              Protocolo STMU informado: {attempt.officialProtocolMasked}
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
                Protocolo STMU (opcional)
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
                  onChange={(event) => setResolved(event.target.value === "resolved")}
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
