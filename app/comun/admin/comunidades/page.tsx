import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import {
  COMMUNITY_MEMBERSHIP_REVIEW_GATE,
  communityRoles,
} from "@/lib/community-administration";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  changeCommunityWorkGroupMember,
  createCommunityWorkGroup,
  grantCommunityRole,
  reviewCommunityMembership,
  revokeCommunityRole,
} from "./actions";

export const dynamic = "force-dynamic";
const openOperationStates = [
  "pending",
  "assigned",
  "in_review",
  "blocked",
  "ready",
];

export default async function CommunityAdministrationPage() {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");

  const [
    communitiesResult,
    operationsResult,
    membershipsResult,
    rolesResult,
    groupsResult,
    groupMembersResult,
    pautasResult,
  ] = await Promise.all([
    db
      .from("comun_communities")
      .select("id,slug,name,short_description,is_active")
      .eq("is_active", true)
      .order("name"),
    db
      .from("comun_editorial_operation_items")
      .select("id,source_id,state,created_at,indicative_due_at,next_action")
      .eq("human_gate", COMMUNITY_MEMBERSHIP_REVIEW_GATE)
      .in("state", openOperationStates)
      .order("created_at"),
    db
      .from("comun_community_memberships")
      .select(
        "id,community_id,member_user_id,state,collaboration_preferences,update_preferences,joined_at,updated_at,community:comun_communities!inner(slug,name)",
      )
      .in("state", ["following", "member", "paused"])
      .order("updated_at", { ascending: false }),
    db
      .from("comun_community_role_assignments")
      .select("id,membership_id,role,scope,starts_at,review_at,revoked_at")
      .is("revoked_at", null)
      .order("starts_at", { ascending: false }),
    db
      .from("comun_community_work_groups")
      .select(
        "id,community_id,pauta_id,name,objective,cycle_label,next_action,result_expected,state,starts_at,ends_at,community:comun_communities!inner(slug,name),pauta:comun_pauta_spaces!inner(slug,title)",
      )
      .neq("state", "archived")
      .order("created_at", { ascending: false }),
    db
      .from("comun_community_work_group_members")
      .select("group_id,membership_id,responsibility,joined_at,left_at")
      .is("left_at", null),
    db
      .from("comun_pauta_spaces")
      .select("id,community_id,slug,title,public_status")
      .neq("public_status", "archived")
      .order("title"),
  ]);

  for (const result of [
    communitiesResult,
    operationsResult,
    membershipsResult,
    rolesResult,
    groupsResult,
    groupMembersResult,
    pautasResult,
  ]) {
    if (result.error)
      throw new Error("Não foi possível montar a gestão de comunidades.");
  }

  const communities = communitiesResult.data ?? [];
  const operations = operationsResult.data ?? [];
  const memberships = membershipsResult.data ?? [];
  const roles = rolesResult.data ?? [];
  const groups = groupsResult.data ?? [];
  const groupMembers = groupMembersResult.data ?? [];
  const pautas = pautasResult.data ?? [];
  const userIds = [...new Set(memberships.map((item: any) => item.member_user_id))];
  const profilesResult = userIds.length
    ? await db
        .from("comun_member_profiles")
        .select("user_id,display_name,public_slug,status")
        .in("user_id", userIds)
    : { data: [], error: null };
  if (profilesResult.error)
    throw new Error("Não foi possível carregar os perfis comunitários.");
  const profileByUser = new Map(
    (profilesResult.data ?? []).map((profile: any) => [profile.user_id, profile]),
  );
  const membershipById = new Map(
    memberships.map((membership: any) => [membership.id, membership]),
  );
  const operationRequests = operations
    .map((operation: any) => ({
      operation,
      membership: membershipById.get(operation.source_id),
    }))
    .filter((item: any) => item.membership);
  const activeMembers = memberships.filter((item: any) => item.state === "member");

  return (
    <AdminShell adminEmail={session.admin.email}>
      <div>
        <p className="text-xs font-black uppercase text-comun-yellow">
          Tijolo 47.3 · comunidades completas
        </p>
        <h1 className="text-3xl font-black uppercase">Gestão de comunidades</h1>
        <p className="mt-2 max-w-4xl">
          Solicitações moderadas, vínculos, papéis temporários e grupos de
          trabalho. Acompanhar uma comunidade não concede entrada nem papel.
        </p>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Solicitações" value={operationRequests.length} attention />
        <Metric label="Membros ativos" value={activeMembers.length} />
        <Metric label="Papéis ativos" value={roles.length} />
        <Metric label="Grupos abertos" value={groups.length} />
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-black uppercase">Solicitações de entrada</h2>
        <p className="mt-1 text-sm opacity-75">
          Mais antigas primeiro. A decisão altera apenas o vínculo; papéis são
          concedidos separadamente.
        </p>
        <div className="mt-4 grid gap-4">
          {operationRequests.map(({ operation, membership }: any) => {
            const community = relation(membership.community);
            const profile = profileByUser.get(membership.member_user_id) as any;
            return (
              <article
                className="border-2 border-comun-yellow bg-white p-5 text-comun-black"
                key={operation.id}
              >
                <p className="text-xs font-black uppercase">
                  {community?.name} · {operation.state}
                </p>
                <h3 className="mt-1 text-xl font-black">
                  {profile?.display_name || "Pessoa sem nome público"}
                </h3>
                <p className="mt-2 text-sm">
                  Solicitado em {new Date(operation.created_at).toLocaleString("pt-BR")}
                  {operation.indicative_due_at
                    ? ` · revisar até ${new Date(operation.indicative_due_at).toLocaleString("pt-BR")}`
                    : ""}
                </p>
                <p className="mt-2">
                  Interesses: {membership.collaboration_preferences?.join(" · ") || "não informados"}
                </p>
                <form
                  action={reviewCommunityMembership}
                  className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]"
                >
                  <input type="hidden" name="operation_id" value={operation.id} />
                  <input
                    className="border-2 p-3"
                    maxLength={800}
                    name="review_note"
                    placeholder="Nota interna opcional"
                  />
                  <button className="btn" name="decision" value="approve">
                    Aprovar membro
                  </button>
                  <button
                    className="min-h-11 border-2 border-comun-black px-4 font-black"
                    name="decision"
                    value="reject"
                  >
                    Encerrar sem aprovar
                  </button>
                </form>
              </article>
            );
          })}
          {!operationRequests.length ? (
            <p className="border-2 p-4">Nenhuma solicitação pendente.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-black uppercase">Membros e papéis</h2>
        <div className="mt-4 grid gap-4">
          {activeMembers.map((membership: any) => {
            const community = relation(membership.community);
            const profile = profileByUser.get(membership.member_user_id) as any;
            const assignments = roles.filter(
              (assignment: any) => assignment.membership_id === membership.id,
            );
            return (
              <article className="border-2 bg-white p-5 text-comun-black" key={membership.id}>
                <p className="text-xs font-black uppercase">{community?.name}</p>
                <h3 className="mt-1 text-xl font-black">
                  {profile?.display_name || "Pessoa sem nome público"}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {assignments.map((assignment: any) => (
                    <form action={revokeCommunityRole} key={assignment.id}>
                      <input type="hidden" name="assignment_id" value={assignment.id} />
                      <button className="border-2 px-3 py-2 text-sm font-bold">
                        {assignment.role} · remover
                      </button>
                    </form>
                  ))}
                  {!assignments.length ? <span className="text-sm">Sem papel operacional.</span> : null}
                </div>
                {session.admin.role === "admin" ? (
                  <form action={grantCommunityRole} className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <input type="hidden" name="membership_id" value={membership.id} />
                    <select className="border-2 p-3" name="role" defaultValue="facilitator">
                      {communityRoles.map((role) => (
                        <option value={role} key={role}>{role}</option>
                      ))}
                    </select>
                    <input className="border-2 p-3" name="scope" defaultValue="community" />
                    <input className="border-2 p-3" name="review_at" type="datetime-local" />
                    <button className="btn">Conceder papel</button>
                  </form>
                ) : null}
              </article>
            );
          })}
          {!activeMembers.length ? <p className="border-2 p-4">Nenhum membro ativo.</p> : null}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <form action={createCommunityWorkGroup} className="grid gap-3 border-2 bg-white p-5 text-comun-black">
          <h2 className="text-xl font-black uppercase">Criar grupo de trabalho</h2>
          <label className="grid gap-1 font-bold">
            Comunidade
            <select className="border-2 p-3" name="community_id" required>
              {communities.map((community: any) => (
                <option value={community.id} key={community.id}>{community.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 font-bold">
            Pauta da comunidade
            <select className="border-2 p-3" name="pauta_id" required>
              {pautas.map((pauta: any) => (
                <option value={pauta.id} key={pauta.id}>{pauta.title}</option>
              ))}
            </select>
          </label>
          <Field name="name" label="Nome" maxLength={160} />
          <Area name="objective" label="Objetivo" maxLength={1200} />
          <Field name="cycle_label" label="Ciclo" maxLength={120} />
          <Area name="next_action" label="Próxima ação" maxLength={500} required={false} />
          <Area name="result_expected" label="Resultado esperado" maxLength={800} />
          <select className="border-2 p-3" name="state" defaultValue="proposed">
            <option value="proposed">proposed</option>
            <option value="active">active</option>
            <option value="paused">paused</option>
          </select>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="border-2 p-3" name="starts_at" type="datetime-local" />
            <input className="border-2 p-3" name="ends_at" type="datetime-local" />
          </div>
          <button className="btn">Criar grupo</button>
        </form>

        <div>
          <h2 className="text-2xl font-black uppercase">Grupos existentes</h2>
          <div className="mt-4 grid gap-4">
            {groups.map((group: any) => {
              const community = relation(group.community);
              const pauta = relation(group.pauta);
              const activeGroupMembers = groupMembers.filter(
                (item: any) => item.group_id === group.id,
              );
              const eligibleMembers = activeMembers.filter(
                (membership: any) => membership.community_id === group.community_id,
              );
              return (
                <article className="border-2 bg-white p-5 text-comun-black" key={group.id}>
                  <p className="text-xs font-black uppercase">
                    {community?.name} · {group.state} · {group.cycle_label}
                  </p>
                  <h3 className="mt-1 text-xl font-black">{group.name}</h3>
                  <p className="mt-2">{group.objective}</p>
                  <p className="mt-2 text-sm">Pauta: {pauta?.title}</p>
                  <div className="mt-4 grid gap-2">
                    {activeGroupMembers.map((item: any) => {
                      const membership = membershipById.get(item.membership_id) as any;
                      const profile = membership
                        ? (profileByUser.get(membership.member_user_id) as any)
                        : null;
                      return (
                        <form action={changeCommunityWorkGroupMember} className="flex flex-wrap items-center justify-between gap-3 border-t-2 pt-2" key={item.membership_id}>
                          <input type="hidden" name="group_id" value={group.id} />
                          <input type="hidden" name="membership_id" value={item.membership_id} />
                          <span>{profile?.display_name || "Pessoa sem nome público"} · {item.responsibility}</span>
                          <button className="font-black underline" name="intent" value="leave">Retirar do grupo</button>
                        </form>
                      );
                    })}
                  </div>
                  <form action={changeCommunityWorkGroupMember} className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <input type="hidden" name="group_id" value={group.id} />
                    <select className="border-2 p-3" name="membership_id" required>
                      {eligibleMembers.map((membership: any) => {
                        const profile = profileByUser.get(membership.member_user_id) as any;
                        return <option value={membership.id} key={membership.id}>{profile?.display_name || membership.id.slice(0, 8)}</option>;
                      })}
                    </select>
                    <input className="border-2 p-3" name="responsibility" placeholder="Responsabilidade" maxLength={300} />
                    <button className="btn" name="intent" value="join">Incluir</button>
                  </form>
                </article>
              );
            })}
            {!groups.length ? <p className="border-2 p-4">Nenhum grupo aberto.</p> : null}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function relation(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function Metric({ label, value, attention = false }: { label: string; value: number; attention?: boolean }) {
  return <div className={`border-2 bg-white p-4 text-comun-black ${attention ? "border-comun-yellow" : "border-comun-black"}`}><p className="text-xs font-black uppercase">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>;
}

function Field({ name, label, maxLength }: { name: string; label: string; maxLength: number }) {
  return <label className="grid gap-1 font-bold">{label}<input className="border-2 p-3" maxLength={maxLength} name={name} required /></label>;
}

function Area({ name, label, maxLength, required = true }: { name: string; label: string; maxLength: number; required?: boolean }) {
  return <label className="grid gap-1 font-bold">{label}<textarea className="border-2 p-3" maxLength={maxLength} name={name} required={required} rows={3} /></label>;
}
