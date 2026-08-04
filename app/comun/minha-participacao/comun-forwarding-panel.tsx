"use client";

import { useCallback, useEffect, useState } from "react";

type ForwardingPackage = {
  package_id: string;
  wallet_item_id?: string;
  relata_case_id?: string;
  state: string;
  institutional_text?: string;
  requirements?: Array<{
    key: string;
    label: string;
    required?: boolean;
    sensitive?: boolean;
    satisfied?: boolean;
    value?: string | null;
  }>;
  deadline?: {
    sourceStatedDuration?: number;
    sourceStatedUnit?: string;
    serviceExpectation?: string;
    calculatedDueAt?: string | null;
  };
  official_protocol_masked?: string | null;
  channel_url?: string | null;
};

export function ComunForwardingPanel({
  relataCaseId,
}: {
  relataCaseId: string;
}) {
  const [pkg, setPkg] = useState<ForwardingPackage | null>(null);
  const [locationReference, setLocationReference] = useState("");
  const [contact, setContact] = useState("");
  const [confirmText, setConfirmText] = useState(false);
  const [text, setText] = useState("");
  const [protocol, setProtocol] = useState("");
  const [responseNote, setResponseNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/comun/forwarding/packages", {
      cache: "no-store",
    });
    if (!response.ok) return;
    const value = (await response.json()) as { packages?: ForwardingPackage[] };
    const found = value.packages?.find(
      (item) =>
        item.wallet_item_id === relataCaseId ||
        item.relata_case_id === relataCaseId,
    );
    if (found) {
      setPkg(found);
      setText(found.institutional_text ?? "");
    }
  }, [relataCaseId]);

  // The wallet server is the source of truth after the protocol exists.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function call(
    path: string,
    method: "POST" | "PATCH",
    body: Record<string, unknown>,
  ) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/comun/forwarding/packages/${pkg?.package_id ?? ""}/${path}`,
        {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const value = (await response.json()) as {
        package?: ForwardingPackage;
        code?: string;
      };
      const nextPackage = value.package;
      if (!response.ok || !nextPackage)
        throw new Error(value.code ?? "forwarding_failed");
      setPkg((current) =>
        current ? { ...current, ...nextPackage } : nextPackage,
      );
      if (nextPackage.institutional_text)
        setText(nextPackage.institutional_text);
      return nextPackage;
    } catch {
      setNotice("Não foi possível atualizar o pacote neste laboratório.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createPackage() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/comun/forwarding/packages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          relataCaseId,
          adapterId: "vr-fiscaliza-lighting-v1",
        }),
      });
      const value = (await response.json()) as { package?: ForwardingPackage };
      if (!response.ok || !value.package) throw new Error("package_failed");
      setPkg(value.package);
      setText(value.package.institutional_text ?? "");
    } catch {
      setNotice(
        "O adaptador Fiscaliza VR não está disponível neste laboratório.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!pkg)
    return (
      <div className="grid gap-2 border-t-2 border-comun-black/20 pt-3">
        <p className="text-sm">
          Para preparar um envio institucional, você poderá revisar este relato
          no adaptador municipal.
        </p>
        <button
          type="button"
          onClick={() => void createPackage()}
          disabled={busy}
          className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 text-left font-black"
        >
          Preparar Fiscaliza VR
        </button>
        {notice ? (
          <p role="status" className="text-sm font-bold">
            {notice}
          </p>
        ) : null}
      </div>
    );

  const missing = (pkg.requirements ?? []).filter(
    (item) => item.required && !item.satisfied,
  );
  return (
    <section
      className="grid gap-3 border-t-2 border-comun-black/20 pt-3"
      aria-labelledby={`forwarding-${pkg.package_id}`}
    >
      <div>
        <p className="comun-v2-eyebrow">Pacote institucional</p>
        <h5
          id={`forwarding-${pkg.package_id}`}
          className="font-black normal-case"
        >
          Fiscaliza VR — iluminação pública
        </h5>
        <p className="text-sm">
          O relato continua guardado no COMUN. Nada foi enviado.
        </p>
      </div>
      {missing.length ? (
        <div className="grid gap-2 bg-comun-yellow p-3 text-sm text-comun-black">
          <strong>Para preparar o envio, precisamos de:</strong>
          <ul className="list-disc pl-5">
            {missing.map((item) => (
              <li key={item.key}>{item.label}</li>
            ))}
          </ul>
          <input
            aria-label="Endereço ou ponto de referência"
            value={locationReference}
            onChange={(event) => setLocationReference(event.target.value)}
            placeholder="Endereço ou ponto de referência"
            className="min-h-11 border-2 border-comun-black bg-white p-2"
          />
          <input
            aria-label="Uma forma de contato"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="Telefone ou e-mail (se exigido pelo canal)"
            className="min-h-11 border-2 border-comun-black bg-white p-2"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={confirmText}
              onChange={(event) => setConfirmText(event.target.checked)}
            />{" "}
            Confirmo que quero revisar esta mensagem
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void call("requirements", "PATCH", {
                locationReference,
                contact,
                confirmText,
              })
            }
            className="min-h-11 border-2 border-comun-black bg-white px-3 font-black"
          >
            Salvar requisitos
          </button>
        </div>
      ) : null}
      {pkg.state === "ready_for_review" ? (
        <div className="grid gap-2">
          <label
            className="grid gap-1 text-sm font-bold"
            htmlFor={`institutional-text-${pkg.package_id}`}
          >
            Mensagem para revisar
            <textarea
              id={`institutional-text-${pkg.package_id}`}
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={8}
              className="border-2 border-comun-black bg-white p-3 font-normal"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void call("review", "POST", { institutionalText: text })
            }
            className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 text-left font-black"
          >
            Revisar pacote
          </button>
        </div>
      ) : null}
      {pkg.state === "ready_for_assisted_opening" ? (
        <div className="grid gap-2 bg-[#f8f2e6] p-3">
          <p className="text-sm">
            Você abrirá o site oficial do Fiscaliza VR em uma nova aba. O COMUN
            ainda não enviou nada.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const opened = await call("opened", "POST", {});
              if (opened?.channel_url)
                window.open(
                  opened.channel_url,
                  "_blank",
                  "noopener,noreferrer",
                );
            }}
            className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 text-left font-black"
          >
            Abrir Fiscaliza VR
          </button>
        </div>
      ) : null}
      {pkg.state === "opened_by_person" ? (
        <div className="grid gap-2 bg-[#f8f2e6] p-3">
          <strong>Você conseguiu enviar?</strong>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void call("declare-sent", "POST", { result: "sent" })
              }
              className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 font-black"
            >
              Sim, enviei
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void call("declare-sent", "POST", { result: "not_sent" })
              }
              className="min-h-11 border-2 border-comun-black bg-white px-3 font-black"
            >
              Ainda não
            </button>
          </div>
        </div>
      ) : null}
      {pkg.state === "person_declared_sent" ||
      pkg.state === "official_protocol_pending" ? (
        <div className="grid gap-2">
          <label
            className="grid gap-1 text-sm font-bold"
            htmlFor={`official-protocol-${pkg.package_id}`}
          >
            O Fiscaliza VR mostrou um protocolo?
            <input
              id={`official-protocol-${pkg.package_id}`}
              value={protocol}
              onChange={(event) => setProtocol(event.target.value)}
              placeholder="Digite ou cole o protocolo"
              className="min-h-11 border-2 border-comun-black bg-white p-2 font-normal"
            />
          </label>
          <button
            type="button"
            disabled={busy || !protocol.trim()}
            onClick={() => void call("official-protocol", "POST", { protocol })}
            className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 text-left font-black"
          >
            Registrar protocolo informado
          </button>
          <p className="text-xs">
            Ele será marcado como informado pela pessoa, não verificado pelo
            COMUN.
          </p>
        </div>
      ) : null}
      {pkg.state === "official_protocol_recorded" ||
      pkg.state === "awaiting_response" ? (
        <div className="grid gap-2">
          <label
            className="grid gap-1 text-sm font-bold"
            htmlFor={`response-${pkg.package_id}`}
          >
            Registrar resposta ou andamento
            <textarea
              id={`response-${pkg.package_id}`}
              value={responseNote}
              onChange={(event) => setResponseNote(event.target.value)}
              rows={3}
              className="border-2 border-comun-black bg-white p-2 font-normal"
            />
          </label>
          <button
            type="button"
            disabled={busy || !responseNote.trim()}
            onClick={() =>
              void call("response", "POST", {
                note: responseNote,
                state: "response_recorded",
              })
            }
            className="min-h-11 border-2 border-comun-black bg-white px-3 text-left font-black"
          >
            Registrar resposta
          </button>
        </div>
      ) : null}
      {pkg.deadline?.sourceStatedDuration ? (
        <p className="text-sm">
          Previsão informada pelo serviço: {pkg.deadline.sourceStatedDuration}{" "}
          {pkg.deadline.sourceStatedUnit}. Não é prazo legal.
        </p>
      ) : null}
      {pkg.official_protocol_masked ? (
        <p className="text-sm font-bold">
          Protocolo oficial informado: {pkg.official_protocol_masked}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm font-bold">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
