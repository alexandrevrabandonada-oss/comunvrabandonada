import { SidewalkFirstParticipationForm } from "@/components/sidewalk-first-participation-form";
import { ComunShell, Section } from "@/components/comun-shell";
import { listPublicMapData } from "@/lib/popular-map";
import {
  getSidewalkOperationalRelease,
  SIDEWALK_OPERATIONAL_PAUSED_MESSAGE,
} from "@/lib/sidewalk-operational-release";
import { submitTerritorialContribution } from "./actions";
export const dynamic = "force-dynamic";
const types = [
  ["new_point", "Informar novo ponto"],
  ["correct_point", "Corrigir ponto"],
  ["material_acceptance", "Informar material aceito"],
  ["point_full", "Relatar ponto lotado"],
  ["organization", "Informar cooperativa"],
  ["need_update", "Atualizar necessidade"],
  ["property", "Indicar terreno ou imóvel"],
  ["document", "Enviar referência de documento"],
  ["social_use", "Propor uso social"],
  ["history", "Complementar histórico"],
];
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    tipo?: string;
    territorio?: string;
    origem?: string;
    pauta?: string;
  }>;
}) {
  const p = await searchParams;
  if (p.origem === "calcadas") {
    const sidewalkOperational = await getSidewalkOperationalRelease();
    return (
      <ComunShell showSyntheticNotice={false}>
        <Section>
          <p className="text-xs font-black uppercase text-comun-yellow">
            Pauta das calçadas · contribuição rápida
          </p>
          <h1 className="mt-2 text-4xl font-black uppercase text-comun-yellow">
            Registrar problema na calçada
          </h1>
          <p className="mt-3 max-w-3xl text-comun-paper/75">
            {sidewalkOperational.enabled
              ? "Foto, localização, condição e envio em uma única tela. Tudo passa por revisão antes de aparecer no mapa."
              : SIDEWALK_OPERATIONAL_PAUSED_MESSAGE}
          </p>
          {sidewalkOperational.enabled ? (
            <SidewalkFirstParticipationForm
              pautaSlug={p.pauta ?? "calcadas-em-circulacao"}
            />
          ) : null}
        </Section>
      </ComunShell>
    );
  }
  const { items } = await listPublicMapData();
  return (
    <ComunShell>
      <Section>
        <h1 className="text-4xl font-black uppercase text-comun-yellow">
          Contribuir com o mapa
        </h1>
        <p className="mt-3 max-w-3xl">
          Nada altera o mapa automaticamente. A equipe revisa fonte,
          localização, segurança e autorização antes de publicar.
        </p>
        {p.status === "recebido" ? (
          <p className="my-4 border-2 border-comun-yellow p-3">
            Contribuição recebida como pendente.
          </p>
        ) : null}
        <form
          action={submitTerritorialContribution}
          className="paper-panel mt-5 grid gap-3 border-2 p-5"
        >
          <label className="hidden">
            Empresa
            <input name="company_website" />
          </label>
          <label>
            Tipo
            <select
              name="contribution_type"
              defaultValue={p.tipo ?? "new_point"}
            >
              {types.map(([v, l]) => (
                <option value={v} key={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Item relacionado
            <select name="territory_id" defaultValue={p.territorio ?? ""}>
              <option value="">Novo ou ainda não sei</option>
              {items.map((x: any) => (
                <option value={x.id} key={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Localização aproximada
            <input
              name="approximate_location"
              placeholder="Bairro ou referência pública"
            />
          </label>
          <label>
            Informação para revisão
            <textarea
              required
              minLength={20}
              maxLength={2000}
              name="public_summary"
              rows={5}
            />
          </label>
          <label>
            Detalhes privados para a equipe
            <textarea name="raw_details_private" rows={3} />
          </label>
          <label>
            Contato privado opcional
            <input name="contact_private" />
          </label>
          <p className="text-xs">
            Contato, detalhes brutos, anexos e localização sensível não são
            publicados.
          </p>
          <button className="min-h-12 border-2 bg-comun-yellow font-black uppercase">
            Enviar para moderação
          </button>
        </form>
      </Section>
    </ComunShell>
  );
}
