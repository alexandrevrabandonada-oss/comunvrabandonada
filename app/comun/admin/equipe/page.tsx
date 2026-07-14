import Link from "next/link";
import { upsertAdminProfileAction } from "@/app/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdminRole } from "@/lib/admin-auth";
import { listAdminProfiles } from "@/lib/admin-profiles";
import type { ComunAdminProfile, ComunAdminProfileRole } from "@/lib/types";

const roles: ComunAdminProfileRole[] = ["admin", "editor", "factual_reviewer", "editorial_reviewer", "publisher", "viewer"];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminTeamPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams;
  const session = await requireComunAdminRole(["admin"]);
  const profiles = await listAdminProfiles({ role: searchParams.papel, active: searchParams.ativo, q: searchParams.q });
  const unbound = profiles.filter((profile) => !profile.auth_user_id).length;

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-comun-asphalt/60">Permissoes admin</p>
          <h1 className="text-3xl font-black uppercase">Equipe</h1>
          <p className="mt-1 text-sm font-bold text-comun-asphalt/70">Logado como {session.profile.display_name} / {session.profile.role}</p>
        </div>
        <Link href="/comun/admin/auditoria" className="border-2 border-comun-black bg-white px-3 py-2 text-sm font-black uppercase">Auditoria</Link>
      </div>

      <section className="mt-5 grid gap-3 md:grid-cols-4">
        <Metric label="Perfis" value={profiles.length} />
        <Metric label="Ativos" value={profiles.filter((profile) => profile.active).length} />
        <Metric label="Admins ativos" value={profiles.filter((profile) => profile.active && profile.role === "admin").length} />
        <Metric label="Sem auth vinculado" value={unbound} />
      </section>

      <form className="mt-5 flex flex-wrap items-end gap-2 border-2 border-comun-black bg-white p-3">
        <label className="grid gap-1 text-xs font-black uppercase">Busca<input name="q" defaultValue={searchParams.q ?? ""} className="min-h-10 border-2 border-comun-black px-2" /></label>
        <label className="grid gap-1 text-xs font-black uppercase">Papel<select name="papel" defaultValue={searchParams.papel ?? ""} className="min-h-10 border-2 border-comun-black px-2"><option value="">Todos</option>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-black uppercase">Ativo<select name="ativo" defaultValue={searchParams.ativo ?? ""} className="min-h-10 border-2 border-comun-black px-2"><option value="">Todos</option><option value="true">Ativos</option><option value="false">Inativos</option></select></label>
        <button className="min-h-10 border-2 border-comun-black bg-comun-yellow px-3 text-xs font-black uppercase">Filtrar</button>
        <Link href="/comun/admin/equipe" className="inline-flex min-h-10 items-center border-2 border-comun-black px-3 text-xs font-black uppercase">Limpar</Link>
      </form>

      <section className="mt-5 border-2 border-comun-black bg-white p-4">
        <h2 className="text-xl font-black uppercase">Criar perfil</h2>
        <ProfileForm />
      </section>

      <section className="mt-5 grid gap-3">
        {profiles.map((profile) => (
          <article key={profile.id} className="border-2 border-comun-black bg-white p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
              <div>
                <p className="text-xs font-black uppercase text-comun-asphalt/60">{profile.role} / {profile.active ? "ativo" : "inativo"}</p>
                <h2 className="mt-1 text-lg font-black uppercase">{profile.display_name}</h2>
                <p className="text-sm font-bold text-comun-asphalt/75">{profile.email}</p>
                <p className="mt-2 text-xs font-bold uppercase text-comun-asphalt/60">Auth: {profile.auth_user_id ? "vinculado" : "sem usuario auth vinculado"}</p>
                <p className="text-xs font-bold uppercase text-comun-asphalt/60">Criado: {new Date(profile.created_at).toLocaleDateString("pt-BR")} / Atualizado: {new Date(profile.updated_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <ProfileForm profile={profile} />
            </div>
          </article>
        ))}
        {!profiles.length ? <p className="border-2 border-comun-black bg-white p-4 text-sm text-comun-asphalt/70">Nenhum perfil encontrado.</p> : null}
      </section>
    </AdminShell>
  );
}

function ProfileForm({ profile }: { profile?: ComunAdminProfile }) {
  return (
    <form action={upsertAdminProfileAction} className="grid gap-2 md:grid-cols-2">
      {profile ? <input type="hidden" name="profile_id" value={profile.id} /> : null}
      <Input name="display_name" label="Nome publico" defaultValue={profile?.display_name ?? ""} />
      <Input name="email" label="E-mail" defaultValue={profile?.email ?? ""} />
      <label className="grid gap-1 text-xs font-black uppercase">Papel<select name="role" defaultValue={profile?.role ?? "viewer"} className="min-h-10 border-2 border-comun-black px-2">{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-black uppercase">Status<select name="active" defaultValue={profile?.active === false ? "false" : "true"} className="min-h-10 border-2 border-comun-black px-2"><option value="true">Ativo</option><option value="false">Inativo</option></select></label>
      <Input name="auth_user_id" label="Auth user id" defaultValue={profile?.auth_user_id ?? ""} />
      <label className="flex min-h-10 items-center gap-2 border-2 border-comun-black px-3 text-xs font-black uppercase"><input type="checkbox" name="clear_auth_link" value="true" /> Remover vinculo auth</label>
      <label className="grid gap-1 text-xs font-black uppercase md:col-span-2">Nota operacional curta<textarea name="operational_note" defaultValue={profile?.operational_note ?? ""} rows={2} className="border-2 border-comun-black p-2" /></label>
      <button className="min-h-10 border-2 border-comun-black bg-comun-yellow text-xs font-black uppercase md:col-span-2">{profile ? "Salvar perfil" : "Criar perfil"}</button>
    </form>
  );
}

function Input({ name, label, defaultValue = "" }: { name: string; label: string; defaultValue?: string }) {
  return <label className="grid gap-1 text-xs font-black uppercase">{label}<input name={name} defaultValue={defaultValue} className="min-h-10 border-2 border-comun-black px-2" /></label>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border-2 border-comun-black bg-white p-4"><p className="text-xs font-black uppercase text-comun-asphalt/60">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>;
}
