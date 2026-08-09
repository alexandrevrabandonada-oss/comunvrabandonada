"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import { ComunShell } from "@/components/comun-shell";
import type { ComunRelataReceipt } from "@/lib/comun-relata-persistence";
import type {
  SidewalkAffectedGroup,
  SidewalkCondition,
  SidewalkProblem,
} from "@/lib/comun-sidewalk-p4-contract";

const SidewalkRealPointPicker = dynamic(
  () =>
    import("@/components/sidewalk-real-point-picker").then(
      (module) => module.SidewalkRealPointPicker,
    ),
  { ssr: false },
);

const conditions: Array<[SidewalkCondition, string]> = [
  ["good", "Boa"],
  ["regular", "Regular"],
  ["bad", "Ruim"],
  ["terrible", "Péssima"],
];
const problems: Array<[SidewalkProblem, string]> = [
  ["hole", "Buraco"],
  ["irregular", "Irregular"],
  ["no_ramp", "Sem rampa"],
  ["obstacle", "Obstáculo"],
  ["narrow", "Estreita"],
  ["no_sidewalk", "Sem calçada"],
];
const groups: Array<[SidewalkAffectedGroup, string]> = [
  ["wheelchair_users", "Cadeira de rodas"],
  ["visual_impairment", "Deficiência visual"],
  ["older_people", "Pessoas idosas"],
  ["children", "Crianças"],
  ["strollers", "Carrinhos"],
  ["temporary_mobility", "Mobilidade temporária"],
  ["general_circulation", "Circulação geral"],
];

function proof() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function toggle<T extends string>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function SidewalkRelataIntakeForm({
  progressiveCaptureEnabled,
}: {
  progressiveCaptureEnabled: boolean;
}) {
  const proofs = useRef<{
    idempotencyKey: string;
    receiptSecret: string;
  } | null>(null);
  const [condition, setCondition] = useState<SidewalkCondition | null>(null);
  const [selectedProblems, setProblems] = useState<SidewalkProblem[]>([]);
  const [selectedGroups, setGroups] = useState<SidewalkAffectedGroup[]>([]);
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [locationMode, setLocationMode] = useState<"device" | "map" | null>(
    null,
  );
  const [point, setPoint] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ComunRelataReceipt | null>(null);
  const [walletRecoveryCode, setWalletRecoveryCode] = useState<string | null>(
    null,
  );
  const [capturedPhoto, setCapturedPhoto] = useState(false);
  const [queued, setQueued] = useState(false);

  function useDeviceLocation() {
    setLocationMode("device");
    if (!navigator.geolocation) {
      setNotice(
        "Este aparelho não oferece localização. Marque o ponto no mapa.",
      );
      return;
    }
    setNotice("A permissão será pedida agora, depois do seu toque.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPoint([position.coords.longitude, position.coords.latitude]);
        setAccuracy(position.coords.accuracy);
        setNotice("Local pronto para ser guardado de forma privada.");
      },
      () => {
        setPoint(null);
        setNotice(
          "Localização recusada. Você ainda pode marcar o ponto no mapa.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 0 },
    );
  }

  async function persistPhoto(file: File) {
    const start = await fetch("/api/comun/relata/evidence/attachments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mimeType: file.type, sizeBytes: file.size }),
    });
    if (!start.ok) throw new Error("photo_start_failed");
    const value = (await start.json()) as {
      upload: {
        url: string;
        method: "PUT";
        contentType: string;
        finalizeUrl: string;
      };
    };
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const upload = await fetch(value.upload.url, {
      method: value.upload.method,
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        "content-type": value.upload.contentType,
        "cache-control": "max-age=3600",
        "x-upsert": "false",
      },
      body: file,
    });
    if (!upload.ok) throw new Error("photo_upload_failed");
    const finalized = await fetch(value.upload.finalizeUrl, {
      method: "POST",
      cache: "no-store",
    });
    if (!finalized.ok) throw new Error("photo_finalize_failed");
  }

  async function captureFirst() {
    if (busy || !photo) {
      setNotice("Tire ou escolha uma foto para guardar o relato primeiro.");
      return;
    }
    setBusy(true);
    setNotice(null);
    let reportWasSaved = Boolean(receipt);
    try {
      proofs.current ??= { idempotencyKey: proof(), receiptSecret: proof() };
      const created = await fetch("/api/comun/calcadas/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phase: "capture",
          text: null,
          hasPhoto: true,
          ...proofs.current,
        }),
      });
      const value = (await created.json()) as {
        receipt?: ComunRelataReceipt;
        intakeReady?: boolean;
        progressiveCapture?: boolean;
        walletRecoveryCode?: string;
      };
      if (
        !created.ok ||
        !value.receipt ||
        value.intakeReady !== false ||
        value.progressiveCapture !== true
      ) {
        throw new Error("capture_failed");
      }
      reportWasSaved = true;
      setReceipt(value.receipt);
      setWalletRecoveryCode(value.walletRecoveryCode ?? null);
      await persistPhoto(photo);
      setCapturedPhoto(true);
      setNotice(
        "Foto guardada de forma privada. Complete as informações para entrar na fila do mapa.",
      );
    } catch {
      setNotice(
        reportWasSaved
          ? "O relato está guardado. A foto ainda não foi anexada; tente novamente ou recupere pela Carteira."
          : "Não foi possível guardar agora. Nenhum órgão recebeu e nada foi publicado.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (
      busy ||
      !condition ||
      selectedProblems.length === 0 ||
      selectedGroups.length === 0 ||
      !point ||
      !locationMode ||
      (progressiveCaptureEnabled && !capturedPhoto)
    ) {
      setNotice(
        "Escolha a condição, ao menos um problema, um impacto e informe o local pelo aparelho ou pelo mapa.",
      );
      return;
    }
    setBusy(true);
    setNotice(null);
    let reportWasSaved = Boolean(receipt);
    let photoFailed = false;
    try {
      if (progressiveCaptureEnabled) {
        const completed = await fetch("/api/comun/calcadas/intake", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            phase: "complete",
            condition,
            problems: selectedProblems,
            affectedGroups: selectedGroups,
          }),
        });
        const value = (await completed.json()) as {
          intakeReady?: boolean;
          sameProtocol?: boolean;
        };
        if (
          !completed.ok ||
          value.intakeReady !== true ||
          value.sameProtocol !== true
        ) {
          throw new Error("adapter_failed");
        }
      } else {
        proofs.current ??= { idempotencyKey: proof(), receiptSecret: proof() };
        const created = await fetch("/api/comun/calcadas/intake", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            condition,
            problems: selectedProblems,
            affectedGroups: selectedGroups,
            description,
            ...proofs.current,
          }),
        });
        if (!created.ok) throw new Error("create_failed");
        const value = (await created.json()) as {
          receipt: ComunRelataReceipt;
          intakeReady: boolean;
          walletRecoveryCode?: string;
        };
        reportWasSaved = true;
        setReceipt(value.receipt);
        setWalletRecoveryCode(value.walletRecoveryCode ?? null);
        if (!value.intakeReady) throw new Error("adapter_failed");
        if (photo) {
          try {
            await persistPhoto(photo);
          } catch {
            photoFailed = true;
          }
        }
      }
      const location = await fetch("/api/comun/relata/evidence/location", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          longitude: point[0],
          latitude: point[1],
          origin: locationMode === "device" ? "device" : "map_pin",
          accuracyMeters: accuracy,
          capturedAt: new Date().toISOString(),
        }),
      });
      if (!location.ok) throw new Error("location_failed");
      const finalized = await fetch("/api/comun/relata/sidewalk/finalize", {
        method: "POST",
        cache: "no-store",
      });
      if (!finalized.ok) throw new Error("finalize_failed");
      setQueued(true);
      setNotice(
        photoFailed
          ? "O registro entrou na fila. A foto não foi anexada e poderá ser adicionada depois."
          : null,
      );
    } catch {
      setNotice(
        reportWasSaved
          ? "O relato foi guardado. Ainda não entrou na fila do Mapa das Calçadas. Você pode completar depois pela Carteira."
          : "Não foi possível guardar agora. Nenhum órgão recebeu e nada foi publicado.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (receipt && (!progressiveCaptureEnabled || queued)) {
    return (
      <ComunShell
        showSyntheticNotice={false}
        appBar={{ title: "Calçadas", contextLabel: "Mapa comunitário" }}
      >
        <main className="mx-auto grid min-h-[70dvh] max-w-2xl content-start gap-5 px-4 py-8">
          <p className="comun-v2-eyebrow">Status</p>
          <h1 className="text-4xl font-black">Guardado no COMUN</h1>
          <section className="border-2 border-comun-black bg-comun-yellow p-4">
            <p className="text-xs font-black uppercase">Protocolo COMUN</p>
            <p className="mt-1 break-all font-mono text-xl font-black">
              {receipt.protocol}
            </p>
          </section>
          <p className="border-l-4 border-comun-yellow bg-white p-4 font-bold">
            {queued
              ? "Seu registro entrou na fila de revisão do Mapa das Calçadas."
              : "Seu relato está guardado, mas ainda precisa ser completado para entrar na fila."}
          </p>
          <p>Ainda não foi publicado. Nenhum órgão recebeu automaticamente.</p>
          {notice ? (
            <p
              role="alert"
              className="border-2 border-comun-black bg-white p-3"
            >
              {notice}
            </p>
          ) : null}
          <Link className="btn w-fit" href="/comun/minha-participacao">
            Ver em Minha Participação
          </Link>
          {walletRecoveryCode ? (
            <section className="border-2 bg-white p-4">
              <b>Código de recuperação da Carteira</b>
              <p className="mt-2 break-all font-mono">{walletRecoveryCode}</p>
              <small>Salve agora. Ele aparece somente neste momento.</small>
            </section>
          ) : null}
        </main>
      </ComunShell>
    );
  }

  return (
    <ComunShell
      showSyntheticNotice={false}
      appBar={{ title: "Calçadas", contextLabel: "Mapa comunitário" }}
    >
      <main
        className="mx-auto grid max-w-2xl gap-6 px-4 py-6"
        data-comun-sidewalk-p4="intake"
      >
        <header>
          <p className="comun-v2-eyebrow">Mapa das Calçadas</p>
          <h1 className="text-3xl font-black sm:text-4xl">
            Registrar problema na calçada
          </h1>
          <p className="mt-2">
            O relato fica privado e só aparece no mapa depois de revisão humana.
          </p>
        </header>
        {progressiveCaptureEnabled && !capturedPhoto ? (
          <section
            className="grid gap-4 border-2 bg-white p-4"
            data-comun-sidewalk-c1="photo-first"
          >
            <div>
              <h2 className="text-xl font-black">1. Guarde a foto primeiro</h2>
              <p>
                Você completa condição, impacto e local depois. Nenhum valor
                será presumido.
              </p>
            </div>
            <label className="inline-flex min-h-12 cursor-pointer items-center justify-center border-2 bg-comun-yellow px-4 font-black">
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              />
              {photo
                ? `Foto privada pronta (${Math.round(photo.size / 1024)} KB)`
                : "Tirar ou escolher foto"}
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={captureFirst}
              className="min-h-12 border-2 bg-comun-yellow px-5 py-3 font-black shadow-[4px_4px_0_#0b0b0a]"
            >
              {busy
                ? "Guardando…"
                : receipt
                  ? "Tentar anexar foto novamente"
                  : "Guardar foto e continuar"}
            </button>
            {receipt ? (
              <p className="break-all border-l-4 border-comun-yellow p-3 font-mono text-sm">
                Protocolo guardado: {receipt.protocol}
              </p>
            ) : null}
            {walletRecoveryCode ? (
              <p className="break-all text-sm">
                <b>Código de recuperação:</b>{" "}
                <span className="font-mono">{walletRecoveryCode}</span>
              </p>
            ) : null}
          </section>
        ) : null}
        {!progressiveCaptureEnabled || capturedPhoto ? (
          <>
            {progressiveCaptureEnabled ? (
              <h2 className="text-2xl font-black">2. Complete para o mapa</h2>
            ) : null}
            <Choice
              title="Condição"
              items={conditions}
              values={condition ? [condition] : []}
              single
              onToggle={(value) => setCondition(value as SidewalkCondition)}
            />
            <Choice
              title="Problemas"
              items={problems}
              values={selectedProblems}
              onToggle={(value) =>
                setProblems(toggle(selectedProblems, value as SidewalkProblem))
              }
            />
            <Choice
              title="Impacto"
              items={groups}
              values={selectedGroups}
              onToggle={(value) =>
                setGroups(
                  toggle(selectedGroups, value as SidewalkAffectedGroup),
                )
              }
            />
            {!progressiveCaptureEnabled ? (
              <label className="grid gap-2 font-bold">
                Descrição opcional
                <textarea
                  className="min-h-24 border-2 p-3 font-normal"
                  maxLength={300}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Inclua somente o contexto necessário; não escreva nome, telefone ou endereço completo."
                />
              </label>
            ) : null}
            {!progressiveCaptureEnabled ? (
              <label className="inline-flex min-h-12 cursor-pointer items-center justify-center border-2 bg-comun-yellow px-4 font-black">
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={(event) =>
                    setPhoto(event.target.files?.[0] ?? null)
                  }
                />
                {photo
                  ? `Foto privada pronta (${Math.round(photo.size / 1024)} KB)`
                  : "Tirar ou escolher foto (opcional)"}
              </label>
            ) : null}
            <section className="grid gap-3 border-2 bg-white p-4">
              <h2 className="text-xl font-black">Local obrigatório</h2>
              <p>
                A coordenada ficará criptografada. O mapa público receberá
                somente outro ponto, aproximado, após revisão.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className={`btn ${locationMode === "device" ? "bg-comun-yellow" : ""}`}
                  onClick={useDeviceLocation}
                >
                  Usar localização
                </button>
                <button
                  type="button"
                  className={`btn ${locationMode === "map" ? "bg-comun-yellow" : ""}`}
                  onClick={() => {
                    setLocationMode("map");
                    setPoint(point);
                    setNotice(null);
                  }}
                >
                  Marcar no mapa
                </button>
              </div>
              {locationMode === "map" ? (
                <SidewalkRealPointPicker
                  point={point}
                  accuracy={accuracy}
                  onChange={(value) => {
                    setPoint(value);
                    setAccuracy(null);
                  }}
                />
              ) : null}
              {point ? (
                <p className="text-sm font-bold">
                  Local selecionado privadamente.
                </p>
              ) : null}
            </section>
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="min-h-12 border-2 bg-comun-yellow px-5 py-3 font-black shadow-[4px_4px_0_#0b0b0a]"
            >
              {busy
                ? "Guardando…"
                : progressiveCaptureEnabled
                  ? "Completar e entrar na fila"
                  : "Guardar e entrar na fila"}
            </button>
          </>
        ) : null}
        {notice ? (
          <p
            role="alert"
            className="border-l-4 border-comun-red bg-white p-3 font-bold"
          >
            {notice}
          </p>
        ) : null}
        <aside className="border-2 bg-comun-asphalt p-4 text-comun-paper">
          <b className="text-comun-yellow">Sem publicação automática</b>
          <p>Nenhum órgão será acionado e nenhum ponto exato será publicado.</p>
        </aside>
      </main>
    </ComunShell>
  );
}

function Choice({
  title,
  items,
  values,
  onToggle,
  single = false,
}: {
  title: string;
  items: ReadonlyArray<readonly [string, string]>;
  values: string[];
  onToggle: (value: string) => void;
  single?: boolean;
}) {
  return (
    <fieldset className="grid gap-3 border-2 bg-white p-4">
      <legend className="px-1 text-xl font-black">{title}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={values.includes(value)}
            onClick={() => onToggle(value)}
            className={`min-h-11 border-2 px-3 py-2 text-left font-bold ${values.includes(value) ? "bg-comun-yellow" : "bg-white"}`}
          >
            {label}
            {single && values.includes(value) ? (
              <span className="sr-only"> selecionada</span>
            ) : null}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
