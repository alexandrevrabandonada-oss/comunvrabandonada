import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { listAdminPautaDossiers } from "@/lib/pauta-dossiers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const reviewStatuses = ["draft", "editorial_review", "changes_requested", "approved", "published", "unpublished", "archived"];

export default async function AdminDossiesPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams;
  const session = await requireComunAdmin();
  const reviewStatus = reviewStatuses.includes(searchParams.status ?? "") ? String(searchParams.status) : "";
  const dossiers = await listAdminPautaDossiers({ reviewStatus });

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-comun-asphalt/60">Pautas sociais</p>
          <h1 className="text-3xl font-black uppercase">Dossies por pauta</h1>
        </div>
        <Link href="/comun/admin/pautas" className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Ver pautas</Link>
      </div>
      <form className="mt-5 flex flex-wrap items-end gap-2 border-2 border-comun-black bg-white p-3">
        <label className="grid gap-1 text-xs font-black uppercase">Status editorial<select name="status" defaultValue={reviewStatus} className="min-h-10 border-2 border-comun-black px-2"><option value="">Todos</option>{reviewStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <button className="min-h-10 border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">Filtrar</button>
        <Link href="/comun/admin/dossies" className="inline-flex min-h-10 items-center border-2 border-comun-black px-3 text-xs font-black uppercase">Limpar</Link>
      </form>
      <div className="mt-5 grid gap-3">
        {dossiers.map((dossier) => (
          <article key={dossier.id} className="border-2 border-comun-black bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-comun-asphalt/60">{dossier.review_status} / {dossier.pauta?.title ?? "pauta removida"}</p>
                <h2 className="text-xl font-black uppercase">{dossier.title}</h2>
                <p className="mt-1 text-xs font-bold text-comun-asphalt/60">Atualizado em {new Date(dossier.updated_at).toLocaleString("pt-BR")}</p>
                <p className="mt-1 text-xs font-bold uppercase text-comun-asphalt/60">{dossier.published_at && !dossier.unpublished_at ? `Publicado em ${new Date(dossier.published_at).toLocaleString("pt-BR")}` : "Nao publicado"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {dossier.review_status === "published" && dossier.public_slug ? <Link href={`/comun/dossies/${dossier.public_slug}`} className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Publico</Link> : null}
                <Link href={`/comun/admin/dossies/${dossier.id}`} className="border-2 border-comun-black bg-comun-yellow px-3 py-2 text-sm font-black uppercase">Abrir</Link>
              </div>
            </div>
          </article>
        ))}
        {!dossiers.length ? <p className="border-2 border-comun-black bg-white p-4">Nenhum dossie criado ainda.</p> : null}
      </div>
    </AdminShell>
  );
}
