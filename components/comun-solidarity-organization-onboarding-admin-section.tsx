import {
  approveOrganizationOnboardingAction,
  reviewOrganizationOnboardingAction,
} from "@/app/comun/admin/organizacao/onboarding-actions";
import { listSolidarityOrganizationOnboardingReviewQueue } from "@/lib/server/comun-solidarity-organization-onboarding";

export async function SolidarityOrganizationOnboardingAdminSection({
  actorUserId,
}: {
  actorUserId: string;
}) {
  const queue = await listSolidarityOrganizationOnboardingReviewQueue(actorUserId);
  return <section className="mt-8" aria-labelledby="solidarity-onboarding-admin-title">
    <h2 id="solidarity-onboarding-admin-title" className="text-xl font-black uppercase">Entrada de organizações da Feirinha</h2>
    <p className="mt-2 max-w-3xl text-sm">Uma aprovação cria a identidade pública, registra a fonte e ativa a primeira facilitação na mesma transação. Não cria oferta nem necessidade.</p>
    <div className="mt-4 grid gap-5">
      {queue.map((item) => <article key={item.onboardingId} className="border-2 border-comun-black bg-white p-5">
        <h3 className="text-xl font-black">{item.organizationName}</h3>
        <p className="mt-2 text-sm"><strong>Tipo candidato:</strong> {item.organizationType}</p>
        <p className="mt-2 text-sm"><strong>Apresentação:</strong> {item.presentation}</p>
        {item.serviceTerritory ? <p className="mt-2 text-sm"><strong>Território informado:</strong> {item.serviceTerritory}</p> : null}
        {item.publicContactCandidate ? <p className="mt-2 text-sm"><strong>Contato candidato:</strong> {item.publicContactCandidate} · {item.publicContactPublicationAuthorized ? "autorizado para publicação" : "não autorizado para publicação"}</p> : null}
        {item.publicSourceUrlCandidate ? <p className="mt-2 break-all text-sm"><strong>Fonte candidata:</strong> {item.publicSourceUrlCandidate}</p> : null}
        <p className="mt-2 text-sm"><strong>Como participa (privado):</strong> {item.participationNotePrivate}</p>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <form action={approveOrganizationOnboardingAction} className="grid gap-3 border border-comun-black/40 p-4">
            <h4 className="font-black">Verificar e incluir</h4>
            <AdminHidden onboardingId={item.onboardingId} />
            <label className="grid gap-1 text-sm font-bold">Classificação confirmada
              <select name="organization_type" defaultValue={item.organizationType} className="min-h-11 border-2 border-comun-black bg-white px-2">
                <option value="cooperative">Cooperativa</option><option value="association">Associação produtiva</option><option value="collective">Coletivo</option><option value="informal_group">Grupo informal</option><option value="solidarity_enterprise">Empreendimento solidário</option><option value="network">Rede comunitária</option><option value="other">Outra forma coletiva</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">Base da verificação
              <select name="source_kind" defaultValue={item.publicSourceUrlCandidate ? "public_url" : "operational_confirmation"} className="min-h-11 border-2 border-comun-black bg-white px-2">
                <option value="public_url">Fonte pública</option><option value="platform_review">Fonte revisada pela plataforma</option><option value="operational_confirmation">Confirmação operacional documentada</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">Título da fonte<input name="source_title" defaultValue={item.publicSourceUrlCandidate ? "Fonte pública da organização" : "Confirmação operacional da organização"} minLength={3} maxLength={200} required /></label>
            <label className="grid gap-1 text-sm font-bold">URL pública, quando houver<input name="source_url" type="url" defaultValue={item.publicSourceUrlCandidate ?? ""} maxLength={1000} /></label>
            <label className="grid gap-1 text-sm font-bold">Resumo público da verificação<textarea name="source_summary" minLength={10} maxLength={600} required defaultValue="Identidade e atuação da organização conferidas para exibição no diretório público." /></label>
            <label className="grid gap-1 text-sm font-bold">Nota operacional privada<textarea name="source_note_private" maxLength={600} /></label>
            <button className="btn justify-self-start">Aprovar organização</button>
          </form>
          <form action={reviewOrganizationOnboardingAction} className="grid content-start gap-3 border border-comun-black/40 p-4">
            <h4 className="font-black">Pedir ajuste ou encerrar</h4>
            <AdminHidden onboardingId={item.onboardingId} />
            <label className="grid gap-1 text-sm font-bold">Mensagem privada<textarea name="review_message" minLength={3} maxLength={600} required /></label>
            <div className="flex flex-wrap gap-2"><button name="decision" value="needs_changes" className="btn">Pedir ajustes</button><button name="decision" value="reject" className="min-h-11 border-2 border-comun-black px-3 font-black">Não aprovar</button></div>
          </form>
        </div>
      </article>)}
      {!queue.length ? <p className="border-2 p-4">Nenhum onboarding aguardando verificação.</p> : null}
    </div>
  </section>;
}

function AdminHidden({ onboardingId }: { onboardingId: string }) {
  return <><input type="hidden" name="request_id" value={crypto.randomUUID()} /><input type="hidden" name="onboarding_id" value={onboardingId} /></>;
}
