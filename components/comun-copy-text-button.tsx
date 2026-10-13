"use client";

import { useEffect, useId, useRef, useState } from "react";

export function ComunCopyTextButton({
  text,
  label,
  copiedLabel,
  manualLabel,
  idleHint,
  className,
}: {
  text: string;
  label: string;
  copiedLabel: string;
  manualLabel: string;
  idleHint?: string;
  className: string;
}) {
  const [status, setStatus] = useState<
    "idle" | "copying" | "copied" | "manual"
  >("idle");
  const busy = useRef(false);
  const button = useRef<HTMLButtonElement>(null);
  const manual = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  useEffect(() => {
    if (status === "manual") {
      manual.current?.focus();
      manual.current?.select();
    }
  }, [status]);

  async function copy() {
    if (busy.current) return;
    busy.current = true;
    setStatus("copying");
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("manual");
    } finally {
      busy.current = false;
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <button
        ref={button}
        type="button"
        onClick={copy}
        disabled={status === "copying"}
        aria-busy={status === "copying"}
        className={className}
      >
        {status === "copied" ? copiedLabel : label}
      </button>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="text-xs font-bold text-comun-asphalt/70"
      >
        {status === "copied"
          ? `${copiedLabel}.`
          : status === "manual"
            ? "A cópia automática não ficou disponível. Selecione o texto abaixo e use Copiar no seu dispositivo."
            : status === "copying"
              ? "Copiando…"
              : idleHint}
      </p>
      {status === "manual" ? (
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={id} className="text-sm font-bold">
            {manualLabel}
          </label>
          <textarea
            ref={manual}
            id={id}
            readOnly
            value={text}
            rows={4}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full min-w-0 border-2 border-comun-black bg-white p-3 text-sm text-comun-black"
          />
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              button.current?.focus();
            }}
            className="min-h-11 self-start border-2 border-comun-black px-3 text-sm font-bold"
          >
            Fechar cópia manual
          </button>
        </div>
      ) : null}
    </div>
  );
}
