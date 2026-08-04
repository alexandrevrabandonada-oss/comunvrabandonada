"use client";
import { useCallback, useEffect, useState } from "react";

type Pkg = {
  package_id: string;
  relata_case_id?: string;
  state: string;
  institutional_text?: string;
  requirements?: Array<{
    key: string;
    label: string;
    required?: boolean;
    satisfied?: boolean;
    value?: string | null;
  }>;
  deadline?: {
    sourceStatedDuration?: number;
    sourceStatedUnit?: string;
    calculatedDueAt?: string | null;
    serviceExpectation?: string;
  };
  channel_url?: string | null;
};
const copy = async (value: string) => {
  if (value) await navigator.clipboard?.writeText(value);
};

export function ComunStmuWhatsappPanel({
  relataCaseId,
}: {
  relataCaseId: string;
}) {
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [fields, setFields] = useState({
    name: "",
    line: "",
    direction: "",
    location: "",
    observedAt: "",
    vehicleOrder: "",
    occurrence: "",
  });
  const [confirmText, setConfirmText] = useState(false);
  const [text, setText] = useState("");
  const [protocol, setProtocol] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/comun/stmu-whatsapp/packages", {
      cache: "no-store",
    });
    if (!response.ok) return;
    const value = (await response.json()) as { packages?: Pkg[] };
    const found = value.packages?.find(
      (item) =>
        item.package_id === relataCaseId ||
        item.relata_case_id === relataCaseId,
    );
    if (found) {
      setPkg(found);
      setText(found.institutional_text ?? "");
    }
  }, [relataCaseId]);
  useEffect(() => {
    // The async fetch synchronizes the wallet item after mount; state updates occur on response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  async function call(
    path: string,
    method: "POST" | "PATCH",
    payload: Record<string, unknown>,
  ) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/comun/stmu-whatsapp/packages/${pkg?.package_id ?? ""}/${path}`,
        {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const value = (await response.json()) as { package?: Pkg };
      if (!response.ok || !value.package) throw new Error();
      setPkg((current) => (current ? { ...current, ...value.package } : null));
      if (value.package.institutional_text)
        setText(value.package.institutional_text);
      return value.package;
    } catch {
      setNotice(
        "O canal STMU continua apenas local e não foi acessado automaticamente.",
      );
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    setBusy(true);
    try {
      const response = await fetch("/api/comun/stmu-whatsapp/packages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ relataCaseId }),
      });
      const value = (await response.json()) as { package?: Pkg };
      if (!response.ok || !value.package) throw new Error();
      setPkg(value.package);
      setText(value.package.institutional_text ?? "");
    } catch {
      setNotice("Não foi possível preparar o pacote STMU neste laboratório.");
    } finally {
      setBusy(false);
    }
  }
  if (!pkg)
    return (
      <div className="grid gap-2 border-t-2 border-comun-black/20 pt-3">
        <p className="text-sm">
          Prepare uma mensagem revisável para o WhatsApp da STMU. Nada será
          enviado pelo COMUN.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void create()}
          className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 text-left font-black"
        >
          Preparar pacote STMU
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
      aria-labelledby={`stmu-${pkg.package_id}`}
    >
      <div>
        <p className="comun-v2-eyebrow">Canal complementar</p>
        <h5 id={`stmu-${pkg.package_id}`} className="font-black normal-case">
          WhatsApp STMU — reclamação de transporte
        </h5>
        <p className="text-sm">
          Menu observado: 1 horário · 2 elogio/sugestão · 3 reclamação.
          Atendimento: segunda a sexta, 8h–17h.
        </p>
        <p className="text-sm font-bold">
          Nada foi enviado. Protocolo STMU permanece não confirmado.
        </p>
      </div>
      {missing.length ? (
        <div className="grid gap-2 bg-comun-yellow p-3 text-sm text-comun-black">
          <strong>Complete ou revise:</strong>
          <label>
            Nome
            <input
              value={fields.name}
              onChange={(e) => setFields({ ...fields, name: e.target.value })}
              className="min-h-11 w-full border-2 border-comun-black bg-white p-2"
            />
          </label>
          <label>
            Linha
            <input
              value={fields.line}
              onChange={(e) => setFields({ ...fields, line: e.target.value })}
              className="min-h-11 w-full border-2 border-comun-black bg-white p-2"
            />
          </label>
          <label>
            Sentido
            <input
              value={fields.direction}
              onChange={(e) =>
                setFields({ ...fields, direction: e.target.value })
              }
              className="min-h-11 w-full border-2 border-comun-black bg-white p-2"
            />
          </label>
          <label>
            Local ou ponto
            <input
              value={fields.location}
              onChange={(e) =>
                setFields({ ...fields, location: e.target.value })
              }
              className="min-h-11 w-full border-2 border-comun-black bg-white p-2"
            />
          </label>
          <label>
            Data e horário
            <input
              value={fields.observedAt}
              onChange={(e) =>
                setFields({ ...fields, observedAt: e.target.value })
              }
              className="min-h-11 w-full border-2 border-comun-black bg-white p-2"
            />
          </label>
          <label>
            Número de ordem (opcional)
            <input
              value={fields.vehicleOrder}
              onChange={(e) =>
                setFields({ ...fields, vehicleOrder: e.target.value })
              }
              className="min-h-11 w-full border-2 border-comun-black bg-white p-2"
            />
          </label>
          <label>
            Tipo do problema
            <input
              value={fields.occurrence}
              onChange={(e) =>
                setFields({ ...fields, occurrence: e.target.value })
              }
              placeholder="ex.: atraso observado"
              className="min-h-11 w-full border-2 border-comun-black bg-white p-2"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={confirmText}
              onChange={(e) => setConfirmText(e.target.checked)}
            />{" "}
            Quero revisar esta mensagem
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void call("requirements", "PATCH", { ...fields, confirmText })
            }
            className="min-h-11 border-2 border-comun-black bg-white px-3 font-black"
          >
            Salvar requisitos
          </button>
        </div>
      ) : null}
      {pkg.state === "ready_for_review" ? (
        <div className="grid gap-2">
          <label className="grid gap-1 text-sm font-bold">
            Mensagem completa para revisar
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              className="border-2 border-comun-black bg-white p-3 font-normal"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void call("review", "POST", { institutionalText: text })
              }
              className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 font-black"
            >
              Confirmar revisão
            </button>
            <button
              type="button"
              onClick={() => void copy(text)}
              className="min-h-11 border-2 border-comun-black bg-white px-3 font-black"
            >
              Copiar mensagem
            </button>
          </div>
        </div>
      ) : null}
      {pkg.state === "ready_for_assisted_opening" ? (
        <div className="grid gap-2 bg-[#f8f2e6] p-3">
          <p className="text-sm">
            Destino exato: https://wa.me/5524992958558. O COMUN não preenche nem
            envia.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy(text)}
              className="min-h-11 border-2 border-comun-black bg-white px-3 font-black"
            >
              Copiar mensagem
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const result = await call("opened", "POST", {});
                if (result?.channel_url)
                  window.open(
                    result.channel_url,
                    "_blank",
                    "noopener,noreferrer",
                  );
              }}
              className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 font-black"
            >
              Abrir WhatsApp
            </button>
          </div>
        </div>
      ) : null}
      {pkg.state === "opened_by_person" ? (
        <div className="grid gap-2 bg-[#f8f2e6] p-3">
          <strong>Como foi?</strong>
          <div className="flex flex-wrap gap-2">
            {[
              ["not_sent", "Ainda estou preenchendo"],
              ["other_data", "O canal pediu outros dados"],
              ["abandoned", "Desisti"],
              ["sent", "Enviei por minha conta"],
            ].map(([result, label]) => (
              <button
                key={result}
                type="button"
                disabled={busy}
                onClick={() => void call("declare-sent", "POST", { result })}
                className="min-h-11 border-2 border-comun-black bg-white px-3 font-black"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {pkg.state === "person_declared_sent" ||
      pkg.state === "official_protocol_pending" ? (
        <div className="grid gap-2">
          <p className="text-sm">A STMU informou um protocolo?</p>
          <input
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            placeholder="Deixe vazio se ainda não"
            className="min-h-11 border-2 border-comun-black bg-white p-2"
          />
          <button
            type="button"
            disabled={busy || !protocol}
            onClick={() => void call("official-protocol", "POST", { protocol })}
            className="min-h-11 w-fit border-2 border-comun-black bg-comun-yellow px-3 font-black"
          >
            Registrar protocolo informado
          </button>
          <p className="text-xs">
            Expectativa documental: retorno em 72 horas; não é garantia nem
            prazo legal.
          </p>
        </div>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm font-bold">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
