/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { isComunSidewalkPublicProjectionEnabled, isComunSidewalkRelataEnabled } from "@/lib/comun-sidewalk-p4-feature";
import { listSidewalkReviewQueue } from "@/lib/comun-sidewalk-review-runtime";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { reviewSidewalkRelata } from "./actions";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!isComunSidewalkRelataEnabled()) notFound();
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");
  const queue = await listSidewalkReviewQueue(db);
  const projectionEnabled = isComunSidewalkPublicProjectionEnabled();
  return (
    <AdminShell adminEmail={session.admin.email}>
      <h1 className="text-3xl font-black uppercase">Relatos de Calçadas</h1>
      <p className="mt-2 max-w-3xl">Fila P4 ligada ao Relata. A posição exibida já é aproximada para revisão; a coordenada exata nunca entra no HTML.</p>
      {!projectionEnabled ? <p className="mt-4 border-l-4 border-comun-yellow bg-white p-4 font-bold">Entrada privada ativa. A decisão de publicação aproximada permanece desligada.</p> : null}
      <section className="mt-7 grid gap-5">
        {queue.map((item) => (
          <article className="grid gap-3 border-2 bg-white p-5" key={item.id}>
            <p className="text-xs font-black uppercase">{item.reviewState} · {new Date(item.createdAt).toLocaleString("pt-BR")}</p>
            <p><b>Condição:</b> {item.condition}</p>
            <p><b>Problemas:</b> {item.problems.join(" · ")}</p>
            <p><b>Grupos afetados:</b> {item.affectedGroups.join(" · ")}</p>
            <details><summary className="font-black">Ler descrição privada</summary><p className="mt-2 whitespace-pre-wrap border-2 p-3">{item.originalText}</p></details>
            {item.privatePhotoUrl ? <div><p className="font-black">Derivada privada temporária</p><img src={item.privatePhotoUrl} alt="Fotografia privada do relato, disponível somente para revisão" className="mt-2 max-h-80 border-2 object-contain" /></div> : <p>Sem fotografia.</p>}
            <section className="border-2 bg-comun-paper p-3"><b>Local aproximado para revisão</b><p>Tipo: {item.locationOrigin} · precisão: {item.locationAccuracyClass}</p><p className="text-sm">Ponto sanitizado disponível para a decisão editorial. A coordenada exata não é exibida.</p></section>
            <form action={reviewSidewalkRelata} className="grid gap-3">
              <input type="hidden" name="intake_id" value={item.id} />
              <label className="grid gap-1 font-bold">Resumo público sanitizado<textarea name="public_summary" minLength={16} maxLength={800} rows={3} className="border-2 p-2 font-normal" /></label>
              <div className="flex flex-wrap gap-2">
                {projectionEnabled ? <button className="btn" name="decision" value="publish_approximate">Publicar aproximado</button> : null}
                <button className="btn" name="decision" value="needs_information">Pedir complemento</button>
                <button className="btn" name="decision" value="reject">Rejeitar</button>
                <button className="btn" name="decision" value="withdraw">Retirar</button>
              </div>
            </form>
          </article>
        ))}
        {!queue.length ? <p className="border-2 bg-white p-5">Nenhum relato aguardando revisão.</p> : null}
      </section>
    </AdminShell>
  );
}
