import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireComunAdminProfile } from "@/lib/admin-auth";
import { QUEUE_LABELS, type OperationQueue } from "@/lib/editorial-operation";
import { canAccessOperationalSurface } from "@/lib/operational-authorization";
import { canAssumeOperationalItem } from "@/lib/operational-responsibility";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { assumeOperationalItem, releaseOwnOperationalItem } from "../actions";

const SOURCE_LINKS: Record<string, string> = {
  communities: "/comun/admin/comunidades",
  pautas: "/comun/admin/pautas",
  actions: "/comun/admin/acoes",
  protocols: "/comun/admin/protocolos",
  sidewalks: "/comun/admin/calcadas/operacao",
  archive: "/comun/admin/acervo",
  radio: "/comun/admin/radio",
  art: "/comun/admin/arte",
  platform: "/comun/admin/auditoria",
};

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const session = await requireComunAdminProfile();
  if (!canAccessOperationalSurface(session.profile, "central"))
    redirect("/comun/admin");
  const { id } = await params;
  const returnTo = (await searchParams).returnTo;
  const safeReturn = returnTo?.startsWith("/comun/admin/operacao?")
    ? returnTo
    : "/comun/admin/operacao";
  const db = createServiceSupabaseClient();
  if (!db) notFound();
  const [itemResult, { data: events }, { data: assignments }] =
    await Promise.all([
      db
        .from("comun_editorial_operation_items")
        .select(
          "id,source_type,source_domain,queue,state,title,public_reason,next_action,priority,indicative_due_at,human_gate,required_role,sla_state,created_at,last_synced_at",
        )
        .eq("id", id)
        .maybeSingle(),
      db
        .from("comun_editorial_operation_events")
        .select("id,event_type,created_at")
        .eq("item_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("comun_editorial_operation_assignments")
        .select(
          "id,assignee_profile_id,role_at_assignment,assignment_kind,status,assigned_at,resolved_at",
        )
        .eq("item_id", id)
        .order("assigned_at", { ascending: false }),
    ]);
  let item = itemResult.data;
  if (itemResult.error) {
    const legacy = await db
      .from("comun_editorial_operation_items")
      .select(
        "id,source_type,queue,state,title,public_reason,next_action,priority,indicative_due_at,human_gate,created_at",
      )
      .eq("id", id)
      .maybeSingle();
    item = legacy.data
      ? {
          ...legacy.data,
          source_domain: "legacy",
          required_role: null,
          sla_state: "not_applicable",
          last_synced_at: legacy.data.created_at,
        }
      : null;
  }
  if (!item) notFound();
  const ownActive = assignments?.some(
    (assignment) =>
      assignment.assignee_profile_id === session.profile.id &&
      assignment.status === "active",
  );
  const canAssume = canAssumeOperationalItem(session.profile, {
    requiredRole: item.required_role,
    state: item.state,
  });
  const sourceHref = SOURCE_LINKS[item.source_domain] ?? "/comun/admin";

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <Link href={safeReturn} className="underline">
        Voltar ao mesmo recorte da fila
      </Link>
      <p className="mt-5 text-sm font-semibold uppercase">
        {item.source_domain.replaceAll("_", " ")} ·{" "}
        {QUEUE_LABELS[item.queue as OperationQueue]}
      </p>
      <h1 className="mt-1 text-3xl font-bold">{item.title}</h1>
      <p className="mt-3">{item.public_reason}</p>
      <dl className="mt-6 grid gap-4 rounded-2xl border p-4 sm:grid-cols-2">
        <div>
          <dt className="font-semibold">Estado</dt>
          <dd>{item.state.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt className="font-semibold">Prazo</dt>
          <dd>{item.sla_state.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt className="font-semibold">Próxima ação</dt>
          <dd>{item.next_action || "Definir em revisão humana"}</dd>
        </div>
        <div>
          <dt className="font-semibold">Papel necessário</dt>
          <dd>
            {item.required_role?.replaceAll("_", " ") || "Equipe responsável"}
          </dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className="rounded-lg border px-4 py-2 font-semibold"
          href={sourceHref}
        >
          Abrir fonte especializada
        </Link>
        {canAssume && !ownActive && (
          <form action={assumeOperationalItem}>
            <input type="hidden" name="item_id" value={item.id} />
            <button className="rounded-lg bg-white px-4 py-2 font-semibold text-black">
              Assumir este cuidado
            </button>
          </form>
        )}
        {ownActive && (
          <form action={releaseOwnOperationalItem}>
            <input type="hidden" name="item_id" value={item.id} />
            <button className="rounded-lg border px-4 py-2 font-semibold">
              Liberar minha atribuição
            </button>
          </form>
        )}
      </div>
      <h2 className="mt-8 text-xl font-semibold">Responsabilidade</h2>
      <p>
        {assignments?.filter((item) => item.status === "active").length ?? 0}{" "}
        atribuição(ões) ativa(s).
      </p>
      <h2 className="mt-8 text-xl font-semibold">Histórico auditável</h2>
      <ol>
        {events?.map((event) => (
          <li key={event.id} className="mt-2">
            {event.event_type.replaceAll("_", " ")} ·{" "}
            {new Date(event.created_at).toLocaleString("pt-BR")}
          </li>
        ))}
      </ol>
    </main>
  );
}
