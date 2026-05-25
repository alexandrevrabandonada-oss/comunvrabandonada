import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { listAdminIssues } from "@/lib/comun-data";

export default async function AdminIssuesPage() {
  const session = await requireComunAdmin();
  const issues = await listAdminIssues();

  return (
    <AdminShell adminEmail={session.admin.email}>
      <h1 className="text-3xl font-black uppercase">Pautas</h1>
      <p className="mt-2 text-sm text-comun-asphalt/75">Lista alimentada pelo Supabase quando configurado, com fallback local apenas para bootstrap.</p>
      <div className="mt-5 grid gap-3">
        {issues.map((issue) => (
          <article key={issue.slug} className="border-2 border-comun-black bg-white p-4">
            <p className="text-xs font-black uppercase">{issue.communitySlug} / {issue.status}</p>
            <h2 className="mt-2 text-xl font-black uppercase">{issue.title}</h2>
            <p className="mt-2 text-sm text-comun-asphalt/75">{issue.summary}</p>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
