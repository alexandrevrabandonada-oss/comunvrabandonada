"use client";
/* eslint-disable @next/next/no-img-element -- preview local de Blob; nunca é URL remota */
import { useEffect, useRef, useState } from "react";
import {
  authorizeSidewalkPhotoUpload,
  confirmSidewalkPhotoUpload,
} from "@/app/comun/mapa/contribuir/actions";
import { SidewalkRealPointPicker } from "@/components/sidewalk-real-point-picker";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  captureSidewalkSubmissionPayload,
  createSingleSubmissionGuard,
  ensureSidewalkAnonymousSession,
  getSidewalkSubmissionReadiness,
} from "@/lib/sidewalk-submission-readiness";
import {
  isSidewalkSubmissionPending,
  SIDEWALK_SUBMISSION_PROGRESS,
  sidewalkSubmissionButtonLabel,
  type SidewalkSubmissionPhase,
} from "@/lib/sidewalk-submission-progress";

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
const problemOptions = [
  ["buraco", "Buraco"],
  ["irregular", "Irregular"],
  ["sem_rampa", "Sem rampa"],
  ["obstaculo", "Obstáculo"],
  ["estreita", "Estreita"],
  ["inexistente", "Sem calçada"],
] as const;
const impactOptions = [
  ["wheelchair_users", "Cadeira de rodas"],
  ["visually_impaired", "Deficiência visual"],
  ["elderly", "Pessoas idosas"],
  ["children", "Crianças"],
  ["strollers", "Carrinhos de bebê"],
  ["temporary_mobility", "Mobilidade temporária"],
  ["general_public", "Circulação geral"],
] as const;
const readinessLabels = {
  photo: "fotografia",
  point: "ponto no mapa",
  point_confirmation: "confirmação do ponto",
  condition: "condição da calçada",
  publication_consent: "autorização para publicação do ponto exato",
  review_confirmation: "conferência final",
} as const;

export function SidewalkFirstParticipationForm({
  pautaSlug,
}: {
  pautaSlug: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null),
    errorRef = useRef<HTMLParagraphElement>(null),
    submissionGuard = useRef(createSingleSubmissionGuard()),
    [preview, setPreview] = useState<string | null>(null),
    [condition, setCondition] = useState(""),
    [categories, setCategories] = useState<string[]>([]),
    [affectedGroups, setAffectedGroups] = useState<string[]>([]),
    [point, setPoint] = useState<[number, number] | null>(null),
    [accuracy, setAccuracy] = useState<number | null>(null),
    [locationState, setLocationState] = useState<LocationState>("idle"),
    [pointConfirmed, setPointConfirmed] = useState(false),
    [consentPublish, setConsentPublish] = useState(false),
    [reviewConfirmed, setReviewConfirmed] = useState(false),
    [submissionError, setSubmissionError] = useState<string | null>(null),
    [submissionPhase, setSubmissionPhase] =
      useState<SidewalkSubmissionPhase>("idle");

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const clearRecoverableError = () => {
    setSubmissionError(null);
    if (submissionPhase === "recoverable_error") setSubmissionPhase("idle");
  };

  const showError = (message: string) => {
    setSubmissionError(message);
    requestAnimationFrame(() =>
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };

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
    try {
      const compressed = await compressPhoto(file),
        transfer = new DataTransfer();
      transfer.items.add(compressed);
      if (fileRef.current) fileRef.current.files = transfer.files;
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(compressed));
      setPointConfirmed(false);
      clearRecoverableError();
      locate();
    } catch {
      showError(
        "Não foi possível preparar esta fotografia. Tente outra imagem.",
      );
    }
  };

  const removePhoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPoint(null);
    setAccuracy(null);
    setPointConfirmed(false);
    setLocationState("idle");
    clearRecoverableError();
    if (fileRef.current) fileRef.current.value = "";
  };

  const readiness = getSidewalkSubmissionReadiness({
      hasPhoto: Boolean(preview),
      hasPoint: Boolean(point),
      pointConfirmed,
      hasCondition: Boolean(condition),
      consentPublish,
      reviewConfirmed,
    }),
    ready = readiness.ready,
    pending = isSidewalkSubmissionPending(submissionPhase);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const photo = fileRef.current?.files?.[0];
    if (!photo || !ready || !submissionGuard.current.enter()) return;
    setSubmissionPhase("validating");
    setSubmissionError(null);
    try {
      // React só mantém currentTarget durante a fase síncrona do handler.
      // Capture os campos antes de aguardar CAPTCHA ou criação da sessão.
      const payload = captureSidewalkSubmissionPayload(event.currentTarget);
      const client = createSupabaseBrowserClient();
      await ensureSidewalkAnonymousSession(client, undefined, (phase) =>
        setSubmissionPhase(phase),
      );
      setSubmissionPhase("authorizing_upload");
      const authorization = await authorizeSidewalkPhotoUpload({
        filename: photo.name,
        mimeType: photo.type || "image/jpeg",
        sizeBytes: photo.size,
        payload,
      });
      if (!authorization.ok) throw new Error(authorization.error);
      setSubmissionPhase("uploading_photo");
      const uploaded = await client.storage
        .from("archive-private-originals")
        .uploadToSignedUrl(authorization.path, authorization.token, photo, {
          contentType: photo.type || "image/jpeg",
          upsert: false,
        });
      if (uploaded.error)
        throw new Error("Falha ao enviar a fotografia privada.");
      setSubmissionPhase("confirming_record");
      await confirmSidewalkPhotoUpload(authorization.uploadId);
      setSubmissionPhase("success");
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar agora. Tente novamente.",
      );
      setSubmissionPhase("recoverable_error");
      submissionGuard.current.release();
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-6 grid gap-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0"
    >
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
      <input
        type="hidden"
        name="consent_location_precision"
        value={consentPublish ? "exact" : "none"}
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
                  onClick={removePhoto}
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
              <SidewalkRealPointPicker
                point={point}
                accuracy={accuracy}
                onChange={(value) => {
                  clearRecoverableError();
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
                    onChange={(event) => {
                      clearRecoverableError();
                      setPointConfirmed(event.target.checked);
                    }}
                    className="size-6"
                  />
                  Confirmo este ponto após conferir no mapa real
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
                  onClick={() => {
                    clearRecoverableError();
                    setCondition(value);
                  }}
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
              {problemOptions.map(([value, label]) => (
                <button
                  type="button"
                  aria-pressed={categories.includes(value)}
                  key={value}
                  onClick={() => {
                    clearRecoverableError();
                    setCategories((all) =>
                      all.includes(value)
                        ? all.filter((item) => item !== value)
                        : [...all, value],
                    );
                  }}
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
              {impactOptions.map(([value, label]) => (
                <button
                  type="button"
                  aria-pressed={affectedGroups.includes(value)}
                  key={value}
                  onClick={() => {
                    clearRecoverableError();
                    setAffectedGroups((all) =>
                      all.includes(value)
                        ? all.filter((item) => item !== value)
                        : [...all, value],
                    );
                  }}
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
              A fotografia original e a identidade permanecem privadas. Se a
              equipe aprovar a contribuição, uma derivada revisada e o ponto
              exato marcado poderão aparecer no mapa público.
            </p>
            <label className="flex min-h-11 items-start gap-3">
              <input
                type="checkbox"
                checked={consentPublish}
                onChange={(event) => {
                  clearRecoverableError();
                  setConsentPublish(event.target.checked);
                }}
                className="mt-1 size-6"
              />
              <span>
                Autorizo a publicação do ponto exato marcado e de uma versão
                sanitizada da contribuição após moderação.
              </span>
            </label>
            <label className="flex min-h-11 items-start gap-3">
              <input
                type="checkbox"
                checked={reviewConfirmed}
                onChange={(event) => {
                  clearRecoverableError();
                  setReviewConfirmed(event.target.checked);
                }}
                className="mt-1 size-6"
              />
              <span>
                Conferi fotografia, local, condição e impacto antes do envio.
              </span>
            </label>
          </section>

          <button
            disabled={!ready || pending}
            aria-describedby="sidewalk-submit-progress"
            data-submission-phase={submissionPhase}
            className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] z-20 min-h-14 w-full border-2 border-comun-black bg-comun-yellow px-5 text-lg font-black uppercase text-comun-black shadow-[3px_3px_0_#0b0b0a] disabled:opacity-50 lg:bottom-4"
          >
            {sidewalkSubmissionButtonLabel(submissionPhase)}
          </button>
          <p
            id="sidewalk-submit-progress"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={
              submissionPhase === "idle" ||
              submissionPhase === "recoverable_error"
                ? "sr-only"
                : "border-l-4 border-comun-yellow bg-comun-paper p-4 text-sm font-bold text-comun-black"
            }
          >
            {SIDEWALK_SUBMISSION_PROGRESS[submissionPhase]}
          </p>
          {submissionError ? (
            <p
              ref={errorRef}
              role="alert"
              className="border-l-4 border-comun-yellow bg-comun-paper p-4 text-comun-black"
            >
              <strong>O envio não foi concluído.</strong>
              <br />
              {submissionError}
            </p>
          ) : null}
          {!ready ? (
            <p role="status" className="text-sm text-comun-paper/75">
              Falta:{" "}
              {readiness.missing
                .map((item) => readinessLabels[item])
                .join(", ")}
              .
            </p>
          ) : null}
          <p className="text-sm text-comun-paper/75">
            Nenhum cadastro é exigido antes do envio. A verificação antirobô
            aparecerá em uma janela visível; depois dela, uma sessão anônima
            limitada permitirá confirmação e acompanhamento neste dispositivo.
          </p>
        </>
      )}
    </form>
  );
}

function locationMessage(state: LocationState, accuracy: number | null) {
  if (state === "locating") return "Obtendo o GPS uma única vez…";
  if (state === "located")
    return `Local encontrado${accuracy ? ` · precisão aproximada de ${Math.round(accuracy)} m` : ""}. Você pode ajustar o marcador no mapa real.`;
  if (state === "low_accuracy")
    return `Precisão baixa (${Math.round(accuracy || 0)} m). Ajuste ou confirme o ponto no mapa real.`;
  if (state === "denied")
    return "Permissão de localização negada. Toque no mapa real para marcar manualmente.";
  if (state === "timeout")
    return "O GPS demorou demais. Toque no mapa real para marcar manualmente.";
  if (state === "unavailable")
    return "GPS indisponível. Toque no mapa real para marcar manualmente.";
  return "Aguardando a fotografia.";
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
