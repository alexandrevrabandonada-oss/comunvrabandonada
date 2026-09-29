import Link from "next/link";
import { upsertAdminProfileAction } from "@/app/actions";
import { provisionExistingSpecialistRoleAction } from "./actions";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdminRole } from "@/lib/admin-auth";
import { listAdminProfiles } from "@/lib/admin-profiles";
import { getCollectiveEntityRoleReadiness } from "@/lib/admin-role-readiness";
import type { ComunAdminProfile, ComunAdminProfileRole } from "@/lib/types";

const roles: ComunAdminProfileRole[] = ["admin", "editor", "factual_reviewer", "editorial_reviewer", "publisher", "viewer"];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminTeamPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams;
  const session = await requireComunAdminRole(["admin"]);
  const [profiles, entityRoleReadiness] = await Promise.all([
    listAdminProfiles({ role: searchParams.papel, active: searchParams.ativo, q: searchParams.q }),
    getCollectiveEntityRoleReadiness(),
  ]);
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-comun-asphalt/60">Entidades coletivas · R4/R5</p>
            <h2 className="text-xl font-black uppercase">Prontidão de papéis</h2>
          </div>
          <span className={`border-2 border-comun-black px-3 py-2 text-xs font-black uppercase ${entityRoleReadiness.operational ? "bg-comun-yellow" : "bg-white"}`}>
            {entityRoleReadiness.operational ? "Operacional" : "Configuração incompleta"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Metric label="Revisores R4" value={entityRoleReadiness.reviewerCapable} />
          <Metric label="Publishers R5" value={entityRoleReadiness.publisherCapable} />
          <Metric label="Acessos admin ativos" value={entityRoleReadiness.activeAdminUsers} />
        </div>
        <p className="mt-3 text-sm font-bold text-comun-asphalt/70">
          A esteira exige pelo menos 2 revisores independentes e 1 publisher. Não transforme um dos dois últimos revisores em publisher; vincule uma terceira conta COMUN.
        </p>

        {searchParams.especialista_erro ? (
          <p role="alert" className="mt-4 border-2 border-red-700 bg-red-50 p-3 text-sm font-bold">
            {specialistErrorMessage(searchParams.especialista_erro)}
          </p>
        ) : null}
        {searchParams.especialista === "vinculado" ? (
          <p role="status" className="mt-4 border-2 border-comun-black bg-comun-yellow p-3 text-sm font-black uppercase">
            Conta existente vinculada ao papel {searchParams.papel ?? "especialista"}.
          </p>
        ) : null}

        <form action={provisionExistingSpecialistRoleAction} className="mt-4 grid gap-3 border-2 border-comun-black bg-comun-paper p-4 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-black uppercase">
            E-mail exato da conta COMUN existente
            <input name="account_email" type="email" required autoComplete="off" className="min-h-10 border-2 border-comun-black bg-white px-2 normal-case" />
          </label>
          <label className="grid gap-1 text-xs font-black uppercase">
            Papel especializado
            <select name="specialist_role" defaultValue="publisher" className="min-h-10 border-2 border-comun-black bg-white px-2">
              <option value="publisher">publisher</option>
              <option value="factual_reviewer">factual_reviewer</option>
              <option value="editorial_reviewer">editorial_reviewer</option>
              <option value="viewer">viewer</option>
            </select>
          </label>
          <label className="flex items-start gap-2 border-2 border-comun-black bg-white p-3 text-xs font-bold md:col-span-2">
            <input type="checkbox" name="confirm_operational_access" className="mt-0.5" />
            <span>Confirmo que esta pessoa deve receber acesso administrativo especializado. Nenhum convite será enviado e nenhuma conta será criada.</span>
          </label>
          <button className="min-h-10 border-2 border-comun-black bg-comun-yellow text-xs font-black uppercase md:col-span-2">
            Vincular conta existente
          </button>
        </form>
      </section>

      <section className="mt-5 border-2 border-comun-black bg-white p-4">
        <h2 className="text-xl font-black uppercase">Criar perfil · avançado</h2>
        <p className="mt-1 text-xs font-bold text-comun-asphalt/60">Use o vínculo por e-mail acima sempre que a pessoa já tiver conta COMUN. O formulário abaixo preserva a manutenção manual existente.</p>
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
      <Input name="auth_user_id" label="Auth user id (avançado)" defaultValue={profile?.auth_user_id ?? ""} />
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


function specialistErrorMessage(code: string) {
  const messages: Record<string, string> = {
    "entrada-invalida": "Informe um e-mail válido, escolha um papel permitido e confirme o acesso.",
    "conta-nao-encontrada": "Nenhuma conta COMUN registrada foi encontrada com esse e-mail. A pessoa deve criar a conta antes do vínculo.",
    "conta-indisponivel": "A conta COMUN existe, mas não está apta a receber acesso administrativo.",
    "perfil-existente": "Essa conta já possui um perfil administrativo diferente. Revise o perfil existente em vez de criar outro.",
    "acesso-admin-existente": "Essa conta já possui acesso administrativo legado além de viewer. Faça a alteração pelo fluxo avançado.",
    "identidade-conflitante": "E-mail e identidade Auth apontam para registros administrativos diferentes.",
    "diretorio-indisponivel": "Não foi possível consultar o diretório Auth agora.",
    "runtime-indisponivel": "O runtime administrativo está indisponível.",
    "falha-provisionamento": "O vínculo foi interrompido sem concluir um novo acesso operacional.",
  };
  return messages[code] ?? "O vínculo foi bloqueado sem alterar o acesso.";
}
