"use client";
/* eslint-disable @next/next/no-img-element -- preview local de Blob; nunca é URL remota */
import { useEffect, useRef, useState } from "react";
import {
  authorizeSidewalkPhotoUpload,
  confirmSidewalkPhotoUpload,
} from "@/app/comun/mapa/contribuir/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  projectMercator,
  unprojectMercator,
  VOLTA_REDONDA_MAP,
} from "@/lib/sidewalk-map-config";

type LocationState =
  | "idle"
  | "locating"
  | "located"
  | "low_accuracy"
  | "denied"
  | "unavailable"
  | "timeout";
const conditionOptions = [
  ["good", "Boa"],
  ["regular", "Regular"],
  ["bad", "Ruim"],
  ["terrible", "Péssima"],
] as const;

export function SidewalkFirstParticipationForm({
  pautaSlug,
}: {
  pautaSlug: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null),
    [preview, setPreview] = useState<string | null>(null),
    [condition, setCondition] = useState(""),
    [categories, setCategories] = useState<string[]>([]),
    [affectedGroups, setAffectedGroups] = useState<string[]>([]),
    [point, setPoint] = useState<[number, number] | null>(null),
    [accuracy, setAccuracy] = useState<number | null>(null),
    [locationState, setLocationState] = useState<LocationState>("idle"),
    [pointConfirmed, setPointConfirmed] = useState(false),
    [sessionReady, setSessionReady] = useState(false),
    [consentPublish, setConsentPublish] = useState(false),
    [reviewConfirmed, setReviewConfirmed] = useState(false),
    [submissionError, setSubmissionError] = useState<string | null>(null),
    [pending, setPending] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const locate = () => {
    if (!navigator.geolocation) {
      setLocationState("unavailable");
      return;
    }
    setLocationState("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPoint([coords.longitude, coords.latitude]);
        setAccuracy(coords.accuracy);
        setPointConfirmed(coords.accuracy <= 50);
        setLocationState(coords.accuracy > 50 ? "low_accuracy" : "located");
      },
      (error) =>
        setLocationState(
          error.code === 1
            ? "denied"
            : error.code === 3
              ? "timeout"
              : "unavailable",
        ),
      {
        enableHighAccuracy: true,
        timeout: Number(
          process.env.NEXT_PUBLIC_SIDEWALK_GPS_TIMEOUT_MS || 10000,
        ),
        maximumAge: 15000,
      },
    );
  };
  const selectPhoto = async (file?: File) => {
    if (!file) return;
    const compressed = await compressPhoto(file);
    const transfer = new DataTransfer();
    transfer.items.add(compressed);
    if (fileRef.current) fileRef.current.files = transfer.files;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(compressed));
    setPointConfirmed(false);
    setSessionReady(false);
    locate();
    const client = createSupabaseBrowserClient();
    const { data } = await client.auth.getSession();
    if (data.session) {
      setSessionReady(true);
      return;
    }
    const { error } = await client.auth.signInAnonymously();
    setSessionReady(!error);
    if (error)
      setSubmissionError(
        "Não foi possível criar a sessão privada neste dispositivo. Tente novamente.",
      );
  };
  const remove = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPoint(null);
    setAccuracy(null);
    setPointConfirmed(false);
    setLocationState("idle");
    if (fileRef.current) fileRef.current.value = "";
  };
  const ready = Boolean(
    preview &&
      point &&
      pointConfirmed &&
      condition &&
      sessionReady &&
      consentPublish &&
      reviewConfirmed,
  );
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const photo = fileRef.current?.files?.[0];
    if (!photo || !ready) return;
    setPending(true);
    setSubmissionError(null);
    try {
      const data = new FormData(event.currentTarget),
        payload = {
          pauta_slug: String(data.get("pauta_slug") ?? ""),
          return_to: String(data.get("return_to") ?? ""),
          description: String(data.get("description") ?? ""),
          category: String(data.get("category") ?? ""),
          problems: String(data.get("problems") ?? ""),
          condition: String(data.get("condition") ?? ""),
          longitude: String(data.get("longitude") ?? ""),
          latitude: String(data.get("latitude") ?? ""),
          location_accuracy_m: String(data.get("location_accuracy_m") ?? ""),
          location_source: String(data.get("location_source") ?? ""),
          affected_groups: String(data.get("affected_groups") ?? ""),
          consent_publish: String(data.get("consent_publish") ?? ""),
        },
        authorization = await authorizeSidewalkPhotoUpload({
          filename: photo.name,
          mimeType: photo.type || "image/jpeg",
          sizeBytes: photo.size,
          payload,
        }),
        client = createSupabaseBrowserClient(),
        uploaded = await client.storage
          .from("archive-private-originals")
          .uploadToSignedUrl(authorization.path, authorization.token, photo, {
            contentType: photo.type || "image/jpeg",
            upsert: false,
          });
      if (uploaded.error)
        throw new Error("Falha ao enviar a fotografia privada.");
      await confirmSidewalkPhotoUpload(authorization.uploadId);
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar agora. Tente novamente.",
      );
      setPending(false);
    }
  };
  return (
    <form onSubmit={submit} className="mt-6 grid gap-4">
      <input type="hidden" name="pauta_slug" value={pautaSlug} />
      <input type="hidden" name="return_to" value="/comun/calcadas" />
      <input type="hidden" name="condition" value={condition} />
      <input type="hidden" name="category" value={categories[0] || "outro"} />
      <input type="hidden" name="problems" value={categories.join(",")} />
      <input
        type="hidden"
        name="affected_groups"
        value={affectedGroups.join(",")}
      />
      <input
        type="hidden"
        name="consent_publish"
        value={consentPublish ? "yes" : "no"}
      />
      <input type="hidden" name="longitude" value={point?.[0] ?? "not-set"} />
      <input type="hidden" name="latitude" value={point?.[1] ?? "not-set"} />
      <input type="hidden" name="location_accuracy_m" value={accuracy ?? ""} />
      <input
        type="hidden"
        name="location_source"
        value={
          locationState === "located" || locationState === "low_accuracy"
            ? "device"
            : "manual"
        }
      />
      <input
        ref={fileRef}
        name="photo"
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Fotografia da calçada"
        className="sr-only"
        onChange={(event) => void selectPhoto(event.target.files?.[0])}
      />
      {submissionError ? (
        <p
          role="alert"
          className="border-l-4 border-comun-yellow bg-comun-paper p-4 text-comun-black"
        >
          {submissionError}
        </p>
      ) : null}
      {!preview ? (
        <section className="border-2 border-comun-yellow bg-comun-paper p-6 text-comun-black">
          <h2 className="text-2xl font-black uppercase">Fotografe a calçada</h2>
          <p className="mt-2">
            Evite rostos, placas e números de casas. A foto e o ponto exato
            ficam privados até a moderação.
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-5 min-h-14 w-full bg-comun-yellow px-5 text-lg font-black uppercase"
          >
            Abrir câmera
          </button>
          <p className="mt-2 text-center text-sm">
            No computador, o mesmo botão abre a galeria.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 border-2 bg-comun-paper p-4 text-comun-black lg:grid-cols-[18rem_1fr]">
            <div>
              <img
                src={preview}
                alt="Prévia privada da fotografia selecionada"
                className="aspect-[4/3] w-full border-2 object-cover"
              />
              <div className="mt-2 flex gap-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="font-black underline"
                >
                  Refazer foto
                </button>
                <button
                  type="button"
                  onClick={remove}
                  className="font-black underline"
                >
                  Remover
                </button>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase">
                Confirme o local
              </h2>
              <p role="status" className="mt-2 text-sm">
                {locationMessage(locationState, accuracy)}
              </p>
              <ManualPointPicker
                point={point}
                accuracy={accuracy}
                onChange={(value) => {
                  setPoint(value);
                  setAccuracy(null);
                  setLocationState("located");
                  setPointConfirmed(true);
                }}
              />
              {point && !pointConfirmed ? (
                <label className="mt-3 flex min-h-11 items-center gap-3 font-bold">
                  <input
                    type="checkbox"
                    checked={pointConfirmed}
                    onChange={(event) =>
                      setPointConfirmed(event.target.checked)
                    }
                    className="size-6"
                  />
                  Confirmo este ponto após conferir no mapa
                </label>
              ) : null}
            </div>
          </section>
          <fieldset className="border-2 bg-comun-paper p-4 text-comun-black">
            <legend className="px-2 font-black uppercase">
              Condição obrigatória
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {conditionOptions.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={condition === value}
                  onClick={() => setCondition(value)}
                  className={`grid min-h-14 place-items-center border-2 p-2 font-black ${condition === value ? "bg-comun-yellow" : "bg-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <section className="border-2 bg-comun-paper p-4 text-comun-black">
            <h2 className="font-black uppercase">Problemas opcionais</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                ["buraco", "Buraco"],
                ["irregular", "Irregular"],
                ["sem_rampa", "Sem rampa"],
                ["obstaculo", "Obstáculo"],
                ["estreita", "Estreita"],
                ["inexistente", "Sem calçada"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  aria-pressed={categories.includes(value)}
                  key={value}
                  onClick={() =>
                    setCategories((all) =>
                      all.includes(value)
                        ? all.filter((x) => x !== value)
                        : [...all, value],
                    )
                  }
                  className={`min-h-11 border-2 px-3 font-bold ${categories.includes(value) ? "bg-comun-yellow" : "bg-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="mt-4 grid gap-1 font-bold">
              Descrição opcional
              <textarea
                name="description"
                maxLength={600}
                rows={3}
                className="border-2 p-3"
              />
            </label>
          </section>
          <section className="border-2 bg-comun-paper p-4 text-comun-black">
            <h2 className="font-black uppercase">Impacto na acessibilidade</h2>
            <p className="mt-1 text-sm">
              Marque quem encontra dificuldade neste trecho. A seleção ajuda na
              triagem, mas não define prioridade automaticamente.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ["wheelchair_users", "Cadeira de rodas"],
                ["visually_impaired", "Deficiência visual"],
                ["elderly", "Pessoas idosas"],
                ["children", "Crianças"],
                ["strollers", "Carrinhos de bebê"],
                ["temporary_mobility", "Mobilidade temporária"],
                ["general_public", "Circulação geral"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  aria-pressed={affectedGroups.includes(value)}
                  key={value}
                  onClick={() =>
                    setAffectedGroups((all) =>
                      all.includes(value)
                        ? all.filter((item) => item !== value)
                        : [...all, value],
                    )
                  }
                  className={`min-h-11 border-2 px-3 font-bold ${affectedGroups.includes(value) ? "bg-comun-yellow" : "bg-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
          <section className="grid gap-3 border-2 border-comun-yellow bg-comun-black p-4 text-comun-paper">
            <h2 className="font-black uppercase">Revise antes de enviar</h2>
            <p className="text-sm">
              A fotografia e o ponto exato ficam privados. Se a equipe aprovar
              a contribuição, somente uma derivada revisada e uma localização
              aproximada poderão aparecer no mapa.
            </p>
            <label className="flex min-h-11 items-start gap-3">
              <input
                type="checkbox"
                checked={consentPublish}
                onChange={(event) => setConsentPublish(event.target.checked)}
                className="mt-1 size-6"
              />
              <span>
                Autorizo a publicação sanitizada da contribuição após moderação.
              </span>
            </label>
            <label className="flex min-h-11 items-start gap-3">
              <input
                type="checkbox"
                checked={reviewConfirmed}
                onChange={(event) => setReviewConfirmed(event.target.checked)}
                className="mt-1 size-6"
              />
              <span>
                Conferi fotografia, local, condição e impacto antes do envio.
              </span>
            </label>
          </section>
          <button
            disabled={!ready || pending}
            className="sticky bottom-20 min-h-14 w-full border-2 border-comun-black bg-comun-yellow px-5 text-lg font-black uppercase text-comun-black shadow-[3px_3px_0_#0b0b0a] disabled:opacity-50"
          >
            {pending ? "Enviando…" : "Enviar para revisão"}
          </button>
          <p className="text-sm text-comun-paper/75">
            Nenhum cadastro é exigido antes do envio. Uma sessão anônima
            limitada é criada somente após a escolha da foto para permitir
            confirmação e acompanhamento neste dispositivo.
          </p>
        </>
      )}
    </form>
  );
}

function locationMessage(state: LocationState, accuracy: number | null) {
  if (state === "locating") return "Obtendo o GPS uma única vez…";
  if (state === "located")
    return `Local encontrado${accuracy ? ` · precisão aproximada de ${Math.round(accuracy)} m` : ""}. Você pode ajustar o marcador.`;
  if (state === "low_accuracy")
    return `Precisão baixa (${Math.round(accuracy || 0)} m). Ajuste ou confirme o ponto manualmente.`;
  if (state === "denied")
    return "Permissão de localização negada. Toque no mapa para marcar manualmente.";
  if (state === "timeout")
    return "O GPS demorou demais. Toque no mapa para marcar manualmente.";
  if (state === "unavailable")
    return "GPS indisponível. Toque no mapa para marcar manualmente.";
  return "Aguardando a fotografia.";
}
function ManualPointPicker({
  point,
  accuracy,
  onChange,
}: {
  point: [number, number] | null;
  accuracy: number | null;
  onChange: (point: [number, number]) => void;
}) {
  const p = point ? projectMercator(point) : null;
  return (
    <>
    <button
      type="button"
      aria-label="Mapa para confirmar ou ajustar o ponto"
      aria-describedby="manual-point-help"
      onKeyDown={(event) => {
        const current = point ?? VOLTA_REDONDA_MAP.center;
        const delta = event.shiftKey ? 0.002 : 0.0005;
        const next: Record<string, [number, number]> = {
          ArrowLeft: [current[0] - delta, current[1]],
          ArrowRight: [current[0] + delta, current[1]],
          ArrowUp: [current[0], current[1] + delta],
          ArrowDown: [current[0], current[1] - delta],
        };
        if (next[event.key]) {
          event.preventDefault();
          onChange(next[event.key]);
        }
      }}
      onClick={(event) => {
        if (event.detail === 0) {
          onChange(point ?? VOLTA_REDONDA_MAP.center);
          return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        onChange(
          unprojectMercator(
            (event.clientX - rect.left) / rect.width,
            (event.clientY - rect.top) / rect.height,
          ),
        );
      }}
      className="relative mt-3 block h-64 w-full overflow-hidden border-2 bg-[#dfe7df]"
    >
      <svg
        viewBox="0 0 600 300"
        className="absolute inset-0 size-full"
        aria-hidden="true"
      >
        <path
          d="M0 190 C100 130 210 230 310 160 S480 90 600 130"
          fill="none"
          stroke={VOLTA_REDONDA_MAP.style.water}
          strokeWidth="22"
        />
      </svg>
      {p ? (
        <>
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-700 bg-blue-300/25"
            style={{
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              width: accuracy
                ? `${Math.min(120, Math.max(30, accuracy))}px`
                : 30,
              height: accuracy
                ? `${Math.min(120, Math.max(30, accuracy))}px`
                : 30,
            }}
          />
          <span
            className="absolute grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 bg-comun-yellow"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
          >
            ●
          </span>
        </>
      ) : null}
      <span className="absolute bottom-2 left-2 bg-white p-2 text-xs font-bold">
        Toque ou use as setas para ajustar o marcador
      </span>
    </button>
    <p id="manual-point-help" className="mt-2 text-sm">
      Sem GPS, use Tab para focar o mapa e as setas para mover o marcador. Use
      Enter ou Espaço para confirmar o ponto.
    </p>
    </>
  );
}
async function compressPhoto(file: File) {
  if (file.size < 1_500_000) return file;
  const bitmap = await createImageBitmap(file),
    scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height)),
    canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value
          ? resolve(value)
          : reject(new Error("Falha ao comprimir imagem.")),
      "image/jpeg",
      0.82,
    ),
  );
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
export function SidewalkDraftCleanup() {
  return null;
}
