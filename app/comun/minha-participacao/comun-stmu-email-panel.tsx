"use client";

import { useEffect, useState } from "react";

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
  }>;
};
const destination = "mailto:stmu@voltaredonda.rj.gov.br";
const copy = async (value: string) => {
  if (value) await navigator.clipboard?.writeText(value);
};

export function ComunStmuEmailPanel({
  relataCaseId,
}: {
  relataCaseId: string;
}) {
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState({
    subject: "Reclamação sobre transporte coletivo",
    line: "",
    direction: "",
    location: "",
    observedAt: "",
    vehicleOrder: "",
  });
  const [confirmText, setConfirmText] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch("/api/comun/stmu-multichannel/packages", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const value = (await response.json()) as { packages?: Pkg[] };
        const found = value.packages?.find(
          (item) =>
            item.package_id === relataCaseId ||
            item.relata_case_id === relataCaseId,
        );
        if (active && found) {
          setPkg(found);
          setText(found.institutional_text ?? "");
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [relataCaseId]);
  async function call(path: string, payload: Record<string, unknown>) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/comun/stmu-multichannel/packages/${pkg?.package_id ?? ""}/${path}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const value = (await response.json()) as { package?: Pkg };
      if (!response.ok || !value.package) throw new Error();
      setPkg((current) =>
        current ? { ...current, ...value.package } : null,
      );
      if (value.package.institutional_text)
        setText(value.package.institutional_text);
      return value.package;
    } catch {
      setNotice(
        "O e-mail permanece apenas preparado; o COMUN não envia mensagens.",
      );
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    setBusy(true);
    try {
      const response = await fetch("/api/comun/stmu-multichannel/packages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ relataCaseId }),
      });
      const value = (await response.json()) as { package?: Pkg };
      if (!response.ok || !value.package) throw new Error();
      setPkg(value.package);
      setText(value.package.institutional_text ?? "");
    } catch {
      setNotice("E-mail institucional ainda não disponível neste ambiente.");
    } finally {
      setBusy(false);
    }
  }
  if (!pkg)
    return (
      <div className="grid gap-2 border-t-2 border-comun-black/20 pt-3">
        <p className="text-sm">
          Tentativa 2 — e-mail institucional STMU. Preparado somente depois de
          uma escolha explícita.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void create()}
          className="min-h-11 border-2 border-comun-black bg-white px-3 text-left font-black"
        >
          Preparar e-mail institucional
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
      aria-labelledby={`stmu-email-${pkg.package_id}`}
    >
      <div>
        <p className="comun-v2-eyebrow">Tentativa alternativa</p>
        <h5
          id={`stmu-email-${pkg.package_id}`}
          className="font-black normal-case"
        >
          E-mail institucional STMU
        </h5>
        <p className="text-sm">
          Destino verificado na página atual: <strong>{destination}</strong>.
          Operação e protocolo ainda não testados.
        </p>
        <p className="text-sm font-bold">
          Nenhum e-mail será enviado pelo COMUN.
        </p>
      </div>
      {missing.length ? (
        <div className="grid gap-2 bg-[#f8f2e6] p-3 text-sm">
          <strong>Complete o pacote:</strong>
          <label>
            Assunto
            <input
              value={fields.subject}
              onChange={(e) =>
                setFields({ ...fields, subject: e.target.value })
              }
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
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={confirmText}
              onChange={(e) => setConfirmText(e.target.checked)}
            />{" "}
            Quero pedir protocolo e revisar
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void call("email-requirements", { ...fields, confirmText })
            }
            className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 font-black"
          >
            Salvar pacote
          </button>
        </div>
      ) : null}
      {pkg.state === "ready_for_review" ? (
        <div className="grid gap-2">
          <label className="grid gap-1 text-sm font-bold">
            Mensagem para revisar
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
                void call("email-review", { institutionalText: text })
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
              Copiar descrição
            </button>
          </div>
        </div>
      ) : null}
      {pkg.state === "ready_for_assisted_opening" ? (
        <div className="grid gap-2 bg-comun-yellow p-3">
          <p className="text-sm">
            Cartões separados: copie assunto e descrição; o destino não recebe
            corpo em URL.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy(fields.subject)}
              className="min-h-11 border-2 border-comun-black bg-white px-3 font-black"
            >
              Copiar assunto
            </button>
            <button
              type="button"
              onClick={() => void copy(text)}
              className="min-h-11 border-2 border-comun-black bg-white px-3 font-black"
            >
              Copiar descrição
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const result = await call("email-opened", {});
                if (result) window.location.href = destination;
              }}
              className="min-h-11 border-2 border-comun-black bg-comun-black px-3 font-black text-white"
            >
              Abrir cliente de e-mail
            </button>
          </div>
        </div>
      ) : null}
      {pkg.state === "opened_by_person" ? (
        <div className="grid gap-2">
          <strong>Como foi?</strong>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void call("declare-sent", { result: "sent" })}
              className="min-h-11 border-2 border-comun-black bg-white px-3 font-black"
            >
              Enviei por minha conta
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void call("declare-sent", { result: "not_sent" })}
              className="min-h-11 border-2 border-comun-black bg-white px-3 font-black"
            >
              Ainda não enviei
            </button>
          </div>
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
