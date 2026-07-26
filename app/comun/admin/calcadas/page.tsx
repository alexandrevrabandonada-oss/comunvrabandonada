import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { decideSidewalkDuplicate, moderateSidewalkObservation, moderateSidewalkRecord } from "./actions";
import { duplicateSignalScore } from "@/lib/sidewalk-operational-loop";
import {
  getSidewalkOperationalRelease,
  SIDEWALK_OPERATIONAL_PAUSED_MESSAGE,
} from "@/lib/sidewalk-operational-release";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const sidewalkOperational = await getSidewalkOperationalRelease();
  if (!sidewalkOperational.enabled) {
    return (
      <AdminShell adminEmail={session.admin.email}>
        <h1 className="text-3xl font-black uppercase">Fila das calçadas</h1>
        <p className="mt-4 border-l-4 border-comun-yellow bg-comun-paper/10 p-4">
          {SIDEWALK_OPERATIONAL_PAUSED_MESSAGE}
        </p>
      </AdminShell>
    );
  }
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco local indisponível.");
  const [records, observations] = await Promise.all([
    db
      .from("comun_sidewalk_records")
      .select(
        "id,name,condition,categories,created_at,approximate_location,neighborhood,private_geometry_geojson,location_accuracy_m,inferred_street,inferred_neighborhood,geographic_risk,status,private_notes,public_summary",
      )
      .in("status", ["under_review", "pending"])
      .order("created_at"),
    db
      .from("comun_sidewalk_observations")
      .select("id,record_id,observation_type,note_private,created_at")
      .eq("status", "pending")
      .order("created_at"),
  ]);
  return (
    <AdminShell adminEmail={session.admin.email}>
      <h1 className="text-3xl font-black uppercase">Fila das calçadas</h1>
      <p className="mt-2">
        Área interna: geometrias, fotos e notas exigem decisão humana. Itens
        mais antigos aparecem primeiro.
      </p>
      <Queue title="Registros">
        {(records.data ?? []).map((item: any) => (
          <article className="border-2 bg-white p-5" key={item.id}>
            <p className="text-xs font-black uppercase">
              Recebido em{" "}
              {new Date(item.created_at).toLocaleDateString("pt-BR")} ·{" "}
              {item.condition} · {item.status}
            </p>
            <h2 className="font-black uppercase">{item.name}</h2>
            <p>
              <strong>Problemas:</strong>{" "}
              {item.categories?.join(" · ") || "não classificados"}
            </p>
            <p>
              <strong>Referência:</strong>{" "}
              {item.approximate_location || item.neighborhood || "protegida"}
            </p>
            <p>
              <strong>Risco:</strong> revisar rostos, menores, placas, números e
              local sensível.
            </p>
            <details className="mt-2">
              <summary className="font-black">Ler texto original privado</summary>
              <p className="mt-2 whitespace-pre-wrap border-2 p-3">
                {item.private_notes || "sem descrição adicional"}
              </p>
            </details>
            <p><strong>Precisão original:</strong> {item.location_accuracy_m == null ? "não informada" : `${Math.round(item.location_accuracy_m)} m`}</p>
            <p><strong>Inferência:</strong> {[item.inferred_street,item.inferred_neighborhood].filter(Boolean).join(" · ") || "ainda não executada"}</p>
            <p><strong>Risco geográfico:</strong> {item.geographic_risk}</p>
            <details>
              <summary className="font-black">Ver geometria privada</summary>
              <pre className="overflow-auto border-2 p-2 text-xs">
                {JSON.stringify(item.private_geometry_geojson)}
              </pre>
            </details>
            <form
              action={moderateSidewalkRecord}
              className="mt-3 grid gap-3"
            >
              <input type="hidden" name="record_id" value={item.id} />
              <label className="grid gap-1 font-bold">
                Resumo público sanitizado
                <textarea name="public_summary" defaultValue={item.public_summary ?? ""} rows={3} maxLength={1600} className="border-2 p-2" />
              </label>
              <label className="grid gap-1 font-bold">
                Pedido de complemento (privado)
                <textarea name="complement_request" rows={2} maxLength={1600} className="border-2 p-2" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 font-bold">Campo ou evidência que falta<input name="complement_field" maxLength={300} className="border-2 p-2" /></label>
                <label className="grid gap-1 font-bold">Prazo opcional<input name="complement_due_at" type="datetime-local" className="border-2 p-2" /></label>
              </div>
              <p className="text-sm">Remova contatos, endereço completo, telefone, e-mail, nomes de terceiros e qualquer informação sensível antes de publicar.</p>
              <div className="flex flex-wrap gap-2">
              {[
                ["approve_approximate", "Aprovar com local aproximado"],
                ["publish_without_image", "Publicar sem imagem"],
                ["needs_information", "Solicitar complemento"],
                ["reject", "Rejeitar"],
                ["withdraw", "Retirar"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  name="decision"
                  value={value}
                  className="btn"
                >
                  {label}
                </button>
              ))}
              </div>
            </form>
            <DuplicateSuggestions item={item} records={records.data ?? []} />
          </article>
        ))}
      </Queue>
      <Queue title="Observações próximas">
        {(observations.data ?? []).map((item: any) => (
          <article className="border-2 bg-white p-5" key={item.id}>
            <p className="text-xs font-black uppercase">
              {item.observation_type} ·{" "}
              {new Date(item.created_at).toLocaleDateString("pt-BR")}
            </p>
            <p className="mt-2">
              <strong>Nota privada:</strong>{" "}
              {item.note_private || "sem complemento"}
            </p>
            <form
              action={moderateSidewalkObservation}
              className="mt-3 flex gap-2"
            >
              <input type="hidden" name="observation_id" value={item.id} />
              <button name="status" value="approved" className="btn">
                Aprovar
              </button>
              <button name="status" value="rejected" className="btn">
                Rejeitar
              </button>
            </form>
          </article>
        ))}
      </Queue>
    </AdminShell>
  );
}

function DuplicateSuggestions({ item, records }: { item: any; records: any[] }) {
  const candidates = records
    .filter((candidate) => candidate.id !== item.id)
    .map((candidate) => {
      const point = item.private_geometry_geojson?.coordinates,
        other = candidate.private_geometry_geojson?.coordinates,
        distanceMeters = Array.isArray(point) && Array.isArray(other)
          ? Math.round(Math.hypot((point[0] - other[0]) * 102_000, (point[1] - other[1]) * 111_000))
          : null,
        score = duplicateSignalScore({
          distanceMeters,
          sameCategory: (item.categories ?? []).some((value: string) => (candidate.categories ?? []).includes(value)),
          hoursApart: Math.abs(new Date(item.created_at).getTime() - new Date(candidate.created_at).getTime()) / 3_600_000,
          sameImageHash: false,
          textSimilarity: 0,
        });
      return { candidate, distanceMeters, score };
    })
    .filter(({ score }) => score.suggested)
    .slice(0, 3);
  if (!candidates.length) return null;
  return (
    <section className="mt-4 border-t-2 pt-3">
      <h3 className="font-black uppercase">Possíveis duplicidades assistidas</h3>
      {candidates.map(({ candidate, distanceMeters, score }) => (
        <form action={decideSidewalkDuplicate} className="mt-2 flex flex-wrap items-center gap-2 border-2 p-3" key={candidate.id}>
          <input type="hidden" name="record_id" value={item.id} />
          <input type="hidden" name="candidate_record_id" value={candidate.id} />
          <input type="hidden" name="score" value={score.score} />
          <input type="hidden" name="signals" value={score.signals.join(",")} />
          <span className="text-sm">{candidate.name} · {distanceMeters == null ? "distância não disponível" : `~${distanceMeters} m`} · pontuação {score.score} · {score.signals.join(", ")}</span>
          <button name="decision" value="related" className="btn">Relacionar</button>
          <button name="decision" value="merged" className="btn">Marcar como mesclada</button>
          <button name="decision" value="distinct" className="btn">Manter distintos</button>
        </form>
      ))}
    </section>
  );
}
function Queue({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7 grid gap-4">
      <h2 className="text-2xl font-black uppercase">{title}</h2>
      {children}
    </section>
  );
}
