import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import {
  buildSidewalkPilotInviteUrl,
  SIDEWALK_PILOT,
  summarizeSidewalkPilot,
} from "@/lib/sidewalk-pilot";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const phaseLabels = {
  preparing: "Preparação",
  active: "Em campo",
  closed: "Encerrado",
} as const;

export default async function SidewalkPilotPage() {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco operacional indisponível.");

  const [uploadsResult, recordsResult, photosResult] = await Promise.all([
    db
      .from("comun_sidewalk_uploads")
      .select(
        "member_user_id,status,confirmation_state,failure_code,created_at,record_id",
      )
      .gte("created_at", SIDEWALK_PILOT.startAt)
      .lt("created_at", SIDEWALK_PILOT.endAt)
      .order("created_at", { ascending: false })
      .limit(1000),
    db
      .from("comun_sidewalk_records")
      .select(
        "id,status,visibility,created_at,updated_at,inferred_neighborhood",
      )
      .gte("created_at", SIDEWALK_PILOT.startAt)
      .lt("created_at", SIDEWALK_PILOT.endAt)
      .order("created_at", { ascending: false })
      .limit(1000),
    db
      .from("comun_sidewalk_record_photos")
      .select("record_id,review_status,is_public")
      .limit(1000),
  ]);

  if (uploadsResult.error || recordsResult.error || photosResult.error)
    throw new Error("Não foi possível calcular o piloto territorial.");

  const summary = summarizeSidewalkPilot({
    uploads: (uploadsResult.data ?? []) as any[],
    records: (recordsResult.data ?? []) as any[],
    photos: (photosResult.data ?? []) as any[],
  });
  const metrics = summary.metrics;

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-comun-yellow">
            Tijolo 46.2 · piloto territorial assistido
          </p>
          <h1 className="text-3xl font-black uppercase">Piloto das calçadas</h1>
          <p className="mt-2 max-w-3xl">
            Uma semana de campo com metas pequenas, moderação diária e retorno
            verificável. O painel usa apenas contagens e bairros inferidos; não
            mostra identidade nem coordenadas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn" href="/comun/admin/calcadas/operacao">
            Abrir operação
          </Link>
          <Link className="btn" href="/comun/calcadas">
            Abrir mapa público
          </Link>
        </div>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Fase" value={phaseLabels[summary.phase]} />
        <Metric
          label="Participantes"
          value={`${metrics.participants}/${SIDEWALK_PILOT.participantTarget}`}
          detail={`${summary.progress.participantsPct}% da meta`}
        />
        <Metric
          label="Registros"
          value={`${metrics.records}/${SIDEWALK_PILOT.recordTarget}`}
          detail={`${metrics.published} publicado(s)`}
        />
        <Metric
          label="Territórios alcançados"
          value={`${summary.progress.territoriesReached}/${SIDEWALK_PILOT.territoryTarget}`}
          detail="contagem por bairro inferido"
        />
      </section>

      <section className="mt-7 border-2 border-comun-yellow p-5">
        <h2 className="text-2xl font-black uppercase">Funil do piloto</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Autorizados" value={String(metrics.authorized)} />
          <Metric label="Confirmados" value={String(metrics.confirmed)} />
          <Metric
            label="Conclusão"
            value={`${metrics.completionRatePct}%`}
            detail={`meta mínima ${SIDEWALK_PILOT.completionTargetPct}%`}
            attention={
              metrics.authorized >= 3 &&
              metrics.completionRatePct < SIDEWALK_PILOT.completionTargetPct
            }
          />
          <Metric
            label="Falha técnica"
            value={`${metrics.technicalFailureRatePct}%`}
            detail={`limite ${SIDEWALK_PILOT.technicalFailureMaxPct}%`}
            attention={
              metrics.technicalFailureRatePct >
              SIDEWALK_PILOT.technicalFailureMaxPct
            }
          />
          <Metric
            label="Retorno"
            value={`${metrics.returnRatePct}%`}
            detail={`meta ${SIDEWALK_PILOT.returnTargetPct}%`}
          />
        </div>
      </section>

      <section className="mt-7 grid gap-4 lg:grid-cols-2">
        <div className="border-2 border-comun-yellow p-5">
          <h2 className="text-xl font-black uppercase">Moderação</h2>
          <dl className="mt-4 grid gap-3">
            <Row label="Pendentes" value={String(metrics.pendingRecords)} />
            <Row label="Fotos pendentes" value={String(metrics.pendingPhotos)} />
            <Row
              label="Decisões em até 24 h"
              value={`${metrics.moderationWithinSla}/${metrics.moderationDecisions}`}
            />
            <Row
              label="Cumprimento do SLA"
              value={`${metrics.moderationSlaPct}%`}
            />
            <Row
              label="Fila mais antiga"
              value={
                metrics.oldestPendingHours == null
                  ? "sem fila"
                  : `${Math.floor(metrics.oldestPendingHours)} h`
              }
            />
          </dl>
        </div>

        <div className="border-2 border-comun-yellow p-5">
          <h2 className="text-xl font-black uppercase">Bairros observados</h2>
          {metrics.neighborhoods.length ? (
            <ul className="mt-4 grid gap-2">
              {metrics.neighborhoods.map((item) => (
                <li
                  className="flex items-center justify-between border-b-2 py-2"
                  key={item.name}
                >
                  <span>{item.name}</span>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4">Nenhum registro recebido na janela do piloto.</p>
          )}
        </div>
      </section>

      <section className="mt-7 border-2 border-comun-yellow bg-comun-paper p-5 text-comun-black">
        <h2 className="text-2xl font-black uppercase">Convites de campo</h2>
        <p className="mt-2 max-w-3xl">
          Os links organizam a mobilização. A medição territorial final usa o
          bairro inferido do ponto enviado, não o texto do convite.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {SIDEWALK_PILOT.territories.map((territory) => {
            const invite = buildSidewalkPilotInviteUrl(territory);
            return (
              <article className="border-2 border-comun-black p-4" key={territory}>
                <h3 className="font-black uppercase">{territory}</h3>
                <p className="mt-2 break-all text-xs">{invite}</p>
                <a
                  className="mt-3 inline-flex min-h-11 items-center bg-comun-yellow px-3 font-black uppercase"
                  href={invite}
                >
                  Abrir convite
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-7 border-l-4 border-comun-yellow bg-comun-black p-5 text-white">
        <h2 className="text-xl font-black uppercase">Rotina de campo</h2>
        <ol className="mt-3 grid gap-2">
          <li>1. Convidar de 10 a 20 pessoas em até três territórios.</li>
          <li>2. Conferir o cockpit ao menos uma vez por dia.</li>
          <li>3. Moderar cada contribuição em até 24 horas.</li>
          <li>4. Retornar à pessoa pela Minha área ou Caixa de entrada.</li>
          <li>5. Encerrar com relatório sanitizado e entrevistas curtas.</li>
        </ol>
      </section>

      {summary.findings.length ? (
        <section className="mt-7 border-2 border-red-500 p-5">
          <h2 className="text-xl font-black uppercase">Pontos de atenção</h2>
          <ul className="mt-3 list-disc pl-5">
            {summary.findings.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>
        </section>
      ) : null}
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
  detail?: string;
  attention?: boolean;
}) {
  return (
    <article
      className={`border-2 p-4 ${attention ? "border-red-500 bg-red-50 text-comun-black" : "border-comun-yellow"}`}
    >
      <p className="text-xs font-black uppercase">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
      {detail ? <p className="mt-1 text-sm opacity-75">{detail}</p> : null}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b-2 pb-2">
      <dt>{label}</dt>
      <dd className="font-black">{value}</dd>
    </div>
  );
}
