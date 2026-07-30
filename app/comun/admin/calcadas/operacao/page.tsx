/* eslint-disable @next/next/no-img-element -- URL privada temporária no cockpit administrativo */
import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import {
  formatSidewalkOperationAge,
  hasExactSidewalkLocationConsent,
  summarizeSidewalkOperations,
} from "@/lib/sidewalk-operations";
import {
  getSidewalkOperationalRelease,
  SIDEWALK_OPERATIONAL_PAUSED_MESSAGE,
} from "@/lib/sidewalk-operational-release";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  moderateSidewalkObservation,
  moderateSidewalkRecord,
} from "../actions";
import { moderateSidewalkRecordExact } from "../exact-actions";

export const dynamic = "force-dynamic";

export default async function SidewalkOperationsPage() {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const operational = await getSidewalkOperationalRelease();

  if (!operational.enabled) {
    return (
      <AdminShell adminEmail={session.admin.email}>
        <h1 className="text-3xl font-black uppercase">Operação das calçadas</h1>
        <p className="mt-4 border-l-4 border-comun-yellow bg-comun-paper/10 p-4">
          {SIDEWALK_OPERATIONAL_PAUSED_MESSAGE}
        </p>
      </AdminShell>
    );
  }

  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco operacional indisponível.");

  const [
    queueResult,
    allRecordsResult,
    uploadsResult,
    photosResult,
    observations,
  ] = await Promise.all([
    db
      .from("comun_sidewalk_records")
      .select(
        "id,slug,name,condition,categories,created_at,approximate_location,neighborhood,private_geometry_geojson,location_accuracy_m,inferred_street,inferred_neighborhood,geographic_risk,status,private_notes,public_summary",
      )
      .in("status", ["under_review", "pending"])
      .order("created_at"),
    db
      .from("comun_sidewalk_records")
      .select("status,visibility,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    db
      .from("comun_sidewalk_uploads")
      .select(
        "record_id,status,confirmation_state,failure_code,created_at,expires_at,submission_payload",
      )
      .order("created_at", { ascending: false })
      .limit(1000),
    db
      .from("comun_sidewalk_record_photos")
      .select(
        "id,record_id,review_status,is_public,derivative_asset_id,comun_archive_assets!comun_sidewalk_record_photos_original_asset_id_fkey(object_key,original_filename)",
      )
      .limit(1000),
    db
      .from("comun_sidewalk_observations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  for (const result of [
    queueResult,
    allRecordsResult,
    uploadsResult,
    photosResult,
    observations,
  ]) {
    if (result.error)
      throw new Error("Não foi possível montar o cockpit operacional.");
  }

  const queue = (queueResult.data ?? []) as any[];
  const uploads = (uploadsResult.data ?? []) as any[];
  const photos = (photosResult.data ?? []) as any[];
  const summary = summarizeSidewalkOperations({
    uploads,
    records: (allRecordsResult.data ?? []) as any[],
    photos,
  });

  const consentByRecord = new Map<string, boolean>();
  for (const upload of uploads) {
    if (!upload.record_id || upload.status !== "confirmed") continue;
    consentByRecord.set(
      upload.record_id,
      hasExactSidewalkLocationConsent(upload.submission_payload),
    );
  }

  const photoByRecord = new Map<string, any>();
  for (const photo of photos) {
    if (photo.record_id && !photoByRecord.has(photo.record_id))
      photoByRecord.set(photo.record_id, photo);
  }

  const privatePhotoByRecord = new Map<string, string>();
  await Promise.all(
    queue.map(async (record) => {
      const photo = photoByRecord.get(record.id);
      const asset = Array.isArray(photo?.comun_archive_assets)
        ? photo.comun_archive_assets[0]
        : photo?.comun_archive_assets;
      if (!asset?.object_key) return;
      const signed = await db.storage
        .from("archive-private-originals")
        .createSignedUrl(asset.object_key, 300);
      if (signed.data?.signedUrl)
        privatePhotoByRecord.set(record.id, signed.data.signedUrl);
    }),
  );

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-comun-yellow">
            Tijolo 46 · operação viva
          </p>
          <h1 className="text-3xl font-black uppercase">
            Operação das calçadas
          </h1>
          <p className="mt-2 max-w-3xl">
            Funil, fila, fotografia privada temporária e decisões editoriais em
            uma única superfície. Nenhuma coordenada aparece nos indicadores.
          </p>
        </div>
        <Link className="btn" href="/comun/admin/calcadas">
          Abrir fila detalhada
        </Link>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Registros na fila"
          value={String(summary.queue.pendingRecords)}
          detail={`mais antigo: ${formatSidewalkOperationAge(summary.queue.oldestAgeHours)}`}
          attention={(summary.queue.oldestAgeHours ?? 0) >= 24}
        />
        <Metric
          label="Fotos aguardando revisão"
          value={String(summary.queue.pendingPhotos)}
          detail="originais continuam privados"
          attention={summary.queue.pendingPhotos > 10}
        />
        <Metric
          label="Falhas nas últimas 24 h"
          value={String(
            summary.failures24h.reduce((total, item) => total + item.count, 0),
          )}
          detail={
            summary.failures24h[0]
              ? summary.failures24h[0].code
              : "nenhuma falha registrada"
          }
          attention={summary.failures24h.length > 0}
        />
        <Metric
          label="Publicados"
          value={String(summary.publishedTotal)}
          detail={`${observations.count ?? 0} observação(ões) na fila`}
        />
      </section>

      <section className="mt-7 border-2 border-comun-yellow p-5">
        <h2 className="text-2xl font-black uppercase">
          Funil dos últimos 7 dias
        </h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          <FunnelStep label="Autorizados" value={summary.funnel7d.authorized} />
          <FunnelStep label="Foto enviada" value={summary.funnel7d.uploaded} />
          <FunnelStep label="Confirmados" value={summary.funnel7d.confirmed} />
          <FunnelStep label="Registros" value={summary.funnel7d.records} />
          <FunnelStep label="Publicados" value={summary.funnel7d.published} />
        </div>
        <p className="mt-3 text-sm opacity-75">
          CAPTCHA e abertura do formulário continuam observados no cliente; o
          cockpit mede os marcos persistidos pelo servidor.
        </p>
      </section>

      {summary.failures24h.length ? (
        <section className="mt-7 border-2 border-comun-yellow bg-comun-paper p-5 text-comun-black">
          <h2 className="text-xl font-black uppercase">Falhas recentes</h2>
          <ul className="mt-3 grid gap-2">
            {summary.failures24h.map((failure) => (
              <li
                className="flex justify-between border-b py-2"
                key={failure.code}
              >
                <code>{failure.code}</code>
                <strong>{failure.count}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 grid gap-5">
        <div>
          <h2 className="text-2xl font-black uppercase">Fila de moderação</h2>
          <p className="mt-1 text-sm opacity-75">
            Mais antigos primeiro. URLs das fotos expiram em cinco minutos.
          </p>
        </div>

        {!queue.length ? (
          <p className="border-2 border-comun-yellow p-5">
            A fila está vazia. Nenhuma decisão editorial pendente.
          </p>
        ) : null}

        {queue.map((item) => {
          const exactConsent = consentByRecord.get(item.id) === true;
          const privatePhoto = privatePhotoByRecord.get(item.id);
          const queueAge = formatSidewalkOperationAge(
            (Date.now() - new Date(item.created_at).getTime()) / 3_600_000,
          );
          return (
            <article
              className="grid gap-5 border-2 border-comun-yellow bg-white p-5 text-comun-black lg:grid-cols-[minmax(15rem,22rem)_1fr]"
              id={`registro-${item.id}`}
              key={item.id}
            >
              <div>
                {privatePhoto ? (
                  <img
                    alt="Fotografia privada temporária para revisão editorial"
                    className="aspect-[4/3] w-full border-2 border-comun-black object-cover"
                    src={privatePhoto}
                  />
                ) : (
                  <div className="grid aspect-[4/3] place-items-center border-2 border-dashed border-comun-black p-4 text-center text-sm">
                    Original privado indisponível para prévia temporária.
                  </div>
                )}
                <p className="mt-3 text-xs font-black uppercase">
                  Na fila há {queueAge}
                </p>
                <p className="mt-1 text-sm">
                  Consentimento para ponto exato: {exactConsent ? "sim" : "não"}
                </p>
                <p className="text-sm">
                  Precisão original:{" "}
                  {item.location_accuracy_m == null
                    ? "não informada"
                    : `${Math.round(item.location_accuracy_m)} m`}
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer font-black">
                    Ver geometria privada
                  </summary>
                  <pre className="mt-2 overflow-auto border-2 p-2 text-xs">
                    {JSON.stringify(item.private_geometry_geojson)}
                  </pre>
                </details>
              </div>

              <div>
                <p className="text-xs font-black uppercase">
                  {new Date(item.created_at).toLocaleString("pt-BR")} ·{" "}
                  {item.condition}
                </p>
                <h3 className="mt-1 text-xl font-black uppercase">
                  {item.name}
                </h3>
                <p className="mt-2">
                  <strong>Problemas:</strong>{" "}
                  {item.categories?.join(" · ") || "não classificados"}
                </p>
                <p>
                  <strong>Referência:</strong>{" "}
                  {item.approximate_location ||
                    item.neighborhood ||
                    "protegida"}
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer font-black">
                    Ler texto original privado
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap border-2 p-3">
                    {item.private_notes || "sem descrição adicional"}
                  </p>
                </details>

                <form
                  action={moderateSidewalkRecord}
                  className="mt-5 grid gap-3"
                >
                  <input type="hidden" name="record_id" value={item.id} />
                  <label className="grid gap-1 font-bold">
                    Resumo público sanitizado
                    <textarea
                      className="border-2 p-3"
                      defaultValue={item.public_summary ?? ""}
                      maxLength={1600}
                      name="public_summary"
                      required
                      rows={3}
                    />
                  </label>
                  <label className="grid gap-1 font-bold">
                    Pedido de complemento privado
                    <textarea
                      className="border-2 p-3"
                      maxLength={1600}
                      name="complement_request"
                      rows={2}
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      className="border-2 p-3"
                      maxLength={300}
                      name="complement_field"
                      placeholder="Campo ou evidência que falta"
                    />
                    <input
                      className="border-2 p-3"
                      name="complement_due_at"
                      type="datetime-local"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn"
                      name="decision"
                      value="approve_approximate"
                    >
                      Publicar aproximado
                    </button>
                    <button
                      className="btn"
                      name="decision"
                      value="publish_without_image"
                    >
                      Publicar sem imagem
                    </button>
                    <button
                      className="btn"
                      name="decision"
                      value="needs_information"
                    >
                      Pedir complemento
                    </button>
                    <button className="btn" name="decision" value="reject">
                      Rejeitar
                    </button>
                    <button className="btn" name="decision" value="withdraw">
                      Retirar
                    </button>
                  </div>
                  <button
                    className="btn disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!exactConsent}
                    formAction={moderateSidewalkRecordExact}
                    title={
                      exactConsent
                        ? undefined
                        : "O envio não contém consentimento explícito para ponto exato."
                    }
                  >
                    Publicar ponto exato consentido
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-8 border-l-4 border-comun-yellow p-4">
        <h2 className="font-black uppercase">Observações comunitárias</h2>
        <p className="mt-1">
          {observations.count ?? 0} observação(ões) aguardando decisão. A fila
          detalhada mantém moderação de observações e sugestões de duplicidade.
        </p>
        <Link
          className="mt-2 inline-flex font-black underline"
          href="/comun/admin/calcadas"
        >
          Abrir observações e duplicidades
        </Link>
      </section>
    </AdminShell>
  );
}

function Metric({
  label,
  value,
  detail,
  attention = false,
}: {
  label: string;
  value: string;
  detail: string;
  attention?: boolean;
}) {
  return (
    <article
      className={`border-2 p-4 ${attention ? "border-comun-yellow bg-comun-yellow text-comun-black" : "border-comun-paper/30"}`}
    >
      <p className="text-xs font-black uppercase">{label}</p>
      <p className="mt-1 text-4xl font-black">{value}</p>
      <p className="mt-1 text-sm">{detail}</p>
    </article>
  );
}

function FunnelStep({ label, value }: { label: string; value: number }) {
  return (
    <article className="border-2 border-comun-paper/30 p-3 text-center">
      <strong className="block text-3xl">{value}</strong>
      <span className="text-xs font-black uppercase">{label}</span>
    </article>
  );
}
