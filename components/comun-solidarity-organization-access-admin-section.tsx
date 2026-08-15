import { listPlatformSolidarityOrganizationAccess } from "@/lib/server/comun-solidarity-organization-governance";
import {
  reviewFirstOrganizationAccessAction,
  revokeOrganizationAccessAsAdminAction,
} from "@/app/comun/admin/organizacao/solidarity-actions";

export async function SolidarityOrganizationAccessAdminSection({
  actorUserId,
}: {
  actorUserId: string;
}) {
  const accesses = await listPlatformSolidarityOrganizationAccess(actorUserId);
  const requests = accesses.filter(
    (access) => access.state === "pending" && access.reviewScope === "platform",
  );
  const active = accesses.filter((access) => access.state === "active");
  return (
    <section className="mt-9" aria-labelledby="solidarity-access-title">
      <p className="text-xs font-black uppercase text-comun-rust">
        Economia solidária
      </p>
      <h2 id="solidarity-access-title" className="mt-1 text-xl font-black uppercase">
        Primeiros vínculos de organizações
      </h2>
      <p className="mt-2 max-w-3xl text-sm">
        Esta fila verifica somente quem poderá facilitar o acesso dentro do
        COMUN. Aprovar não comprova propriedade, representação legal, vínculo
        de trabalho ou associação no mundo real.
      </p>
      <div className="mt-4 grid gap-4">
        {requests.map((request) => (
          <article className="border-2 border-comun-black bg-white p-5" key={request.accessId}>
            <p className="text-xs font-black uppercase text-comun-rust">
              Primeiro vínculo · facilitação
            </p>
            <h3 className="mt-1 text-xl font-black">{request.organization.publicName}</h3>
            <p className="mt-2 text-sm">
              Solicitado por {request.memberLabel} em {formatDate(request.requestedAt)}.
            </p>
            <p className="mt-2 text-sm">{request.requestNotePrivate}</p>
            <form
              action={reviewFirstOrganizationAccessAction}
              className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
            >
              <AccessHiddenFields
                accessId={request.accessId}
                organizationTerritoryId={request.organization.territoryId}
              />
              <label className="grid gap-1 text-sm font-bold">
                Nota privada da análise (opcional)
                <input className="min-h-11 border-2 border-comun-black px-3" maxLength={600} name="review_note" />
              </label>
              <button className="min-h-11 border-2 border-comun-black bg-comun-yellow px-4 font-black" name="decision" value="approve">
                Aprovar acesso
              </button>
              <button className="min-h-11 border-2 border-comun-black px-4 font-black" name="decision" value="reject">
                Não aprovar
              </button>
            </form>
          </article>
        ))}
        {!requests.length ? (
          <p className="border-2 border-dashed border-comun-black/40 bg-white p-5">
            Nenhum primeiro vínculo aguarda análise. Isso é normal.
          </p>
        ) : null}
      </div>
      <h3 className="mt-7 text-lg font-black uppercase">Acessos ativos</h3>
      <p className="mt-2 max-w-3xl text-sm">
        A plataforma pode revogar um acesso ativo em situação excepcional. A
        organização e seu estado público não são alterados.
      </p>
      <div className="mt-4 grid gap-3">
        {active.map((access) => (
          <article className="border-2 border-comun-black bg-white p-4" key={access.accessId}>
            <p className="font-black">{access.organization.publicName}</p>
            <p className="mt-1 text-sm">
              {access.memberLabel} · {access.role === "facilitator" ? "Facilitação" : "Edição"}
            </p>
            <form action={revokeOrganizationAccessAsAdminAction} className="mt-3 flex flex-wrap items-end gap-3">
              <AccessHiddenFields
                accessId={access.accessId}
                organizationTerritoryId={access.organization.territoryId}
              />
              <label className="grid gap-1 text-sm font-bold">
                Motivo privado (opcional)
                <input className="min-h-11 border-2 border-comun-black px-3" maxLength={600} name="review_note" />
              </label>
              <button className="min-h-11 border-2 border-comun-black px-4 font-black">
                Revogar acesso
              </button>
            </form>
          </article>
        ))}
        {!active.length ? (
          <p className="border-2 border-dashed border-comun-black/40 bg-white p-5">
            Nenhum acesso ativo.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function AccessHiddenFields({
  accessId,
  organizationTerritoryId,
}: {
  accessId: string;
  organizationTerritoryId: string;
}) {
  return (
    <>
      <input type="hidden" name="access_id" value={accessId} />
      <input type="hidden" name="organization_territory_id" value={organizationTerritoryId} />
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
