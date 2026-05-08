import { AdminLoginForm } from "@/components/admin-login-form";
import { AdminShell } from "@/components/admin-shell";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { issues } from "@/lib/seed-data";

export default function AdminIssuesPage() {
  if (!isAdminAuthenticated()) return <AdminLoginForm />;
  return (
    <AdminShell>
      <h1 className="text-3xl font-black uppercase">Pautas</h1>
      <p className="mt-2 text-sm text-comun-asphalt/75">MVP com pautas seedadas. Edicao persistente entra no proximo tijolo.</p>
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
