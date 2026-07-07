import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { listAdminPautaDossiers } from "@/lib/pauta-dossiers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDossiesPage() {
  const session = await requireComunAdmin();
  const dossiers = await listAdminPautaDossiers();

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-comun-asphalt/60">Pautas sociais</p>
          <h1 className="text-3xl font-black uppercase">Dossies por pauta</h1>
        </div>
        <Link href="/comun/admin/pautas" className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Ver pautas</Link>
      </div>
      <div className="mt-5 grid gap-3">
        {dossiers.map((dossier) => (
          <article key={dossier.id} className="border-2 border-comun-black bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-comun-asphalt/60">{dossier.status} / {dossier.pauta?.title ?? "pauta removida"}</p>
                <h2 className="text-xl font-black uppercase">{dossier.title}</h2>
                <p className="mt-1 text-xs font-bold text-comun-asphalt/60">Atualizado em {new Date(dossier.updated_at).toLocaleString("pt-BR")}</p>
              </div>
              <Link href={`/comun/admin/dossies/${dossier.id}`} className="border-2 border-comun-black bg-comun-yellow px-3 py-2 text-sm font-black uppercase">Abrir</Link>
            </div>
          </article>
        ))}
        {!dossiers.length ? <p className="border-2 border-comun-black bg-white p-4">Nenhum dossie criado ainda.</p> : null}
      </div>
    </AdminShell>
  );
}
