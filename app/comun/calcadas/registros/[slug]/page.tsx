import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MiniAppExperienceShell,
  SidewalkTimeline,
} from "@/components/sidewalk-miniapp-shell";
import {
  getSidewalkMiniapp,
  getSidewalkMiniappRecord,
} from "@/lib/sidewalk-miniapp";
import { submitSidewalkObservation } from "./actions";
export const dynamic = "force-dynamic";
const labels: Record<string, string> = {
  good: "Boa",
  regular: "Regular",
  bad: "Ruim",
  terrible: "Péssima",
  verified: "Verificada",
  published: "Publicada",
  no_action: "Sem encaminhamento",
  priority: "Vinculada a prioridade",
  forwarded: "Encaminhada",
  waiting_response: "Aguardando resposta",
  in_progress: "Em andamento",
  resolved: "Resolvida",
  reopened: "Reaberta",
};
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [data, miniapp] = await Promise.all([
    getSidewalkMiniappRecord((await params).slug),
    getSidewalkMiniapp(),
  ]);
  if (!data || !miniapp) notFound();
  const r = data.record;
  const events = [
    { label: "Recebido", date: r.last_observed_at, active: true },
    { label: "Verificado", active: r.verification_status === "verified" },
    { label: "Publicado", active: true },
    ...data.observations.map((x: any) => ({
      label:
        x.observation_type === "resolved"
          ? "Comunidade informou resolução"
          : x.observation_type === "worse"
            ? "Comunidade informou piora"
            : "Nova observação comunitária",
      date: x.created_at,
      active: true,
    })),
    ...data.links.map((x: any) => ({
      label: `Vínculo público: ${x.target_type}`,
      date: x.created_at,
      active: true,
    })),
  ];
  return (
    <MiniAppExperienceShell
      active="mapa"
      count={miniapp.records.length}
      community={miniapp.pauta.community}
      coverage={miniapp.config?.coverage_status}
      status={miniapp.pauta.public_status}
      entity={{ label: r.name }}
    >
      <section className="mx-auto grid max-w-5xl gap-5 px-4 py-7">
        <Link href="/comun/calcadas" className="font-bold underline">
          ← Voltar ao mapa
        </Link>
        <div>
          <p className="text-xs font-bold">
            REGISTRO PÚBLICO ·{" "}
            {labels[r.verification_status] ?? r.verification_status}
          </p>
          <h2 className="mt-2 text-3xl font-black">{r.name}</h2>
          <p className="mt-2 max-w-3xl">{r.public_summary}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Fact label="Condição" value={labels[r.condition] ?? r.condition} />
          <Fact
            label="Verificação"
            value={labels[r.verification_status] ?? r.verification_status}
          />
          <Fact
            label="Encaminhamento"
            value={labels[r.forwarding_status] ?? r.forwarding_status}
          />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="border-2 bg-white p-5">
            <h3 className="text-xl font-black">Trecho e problemas</h3>
            <dl className="mt-3 grid gap-3 text-sm">
              <FactRow
                label="Rua ou trecho"
                value={
                  r.approximate_location || "Localização aproximada protegida"
                }
              />
              <FactRow
                label="Bairro"
                value={r.neighborhood || "Não informado"}
              />
              <FactRow
                label="Problemas"
                value={r.categories.join(" · ") || "Não informado"}
              />
              <FactRow
                label="Última observação"
                value={
                  r.last_observed_at
                    ? new Date(r.last_observed_at).toLocaleDateString("pt-BR")
                    : "Não informada"
                }
              />
              <FactRow
                label="Prioridade relacionada"
                value={
                  r.forwarding_status === "priority"
                    ? "Sim"
                    : "Consulte os vínculos"
                }
              />
              <FactRow
                label="Próxima ação"
                value={
                  r.forwarding_status === "resolved"
                    ? "Confirmar se a melhoria permanece"
                    : "Acompanhar e atualizar evidências"
                }
              />
            </dl>
          </div>
          <div className="border-2 bg-white p-5">
            <h3 className="text-xl font-black">Histórico</h3>
            <div className="mt-4">
              <SidewalkTimeline events={events} />
            </div>
          </div>
        </div>
        <form
          action={submitSidewalkObservation}
          className="grid gap-3 border-2 bg-white p-5"
        >
          <input type="hidden" name="slug" value={r.slug} />
          <h3 className="text-xl font-black">Confirmar ou atualizar</h3>
          <p>
            A observação será moderada e não altera o registro automaticamente.
          </p>
          <fieldset>
            <legend className="font-bold">O que você observou?</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[
                ["same", "Continua igual"],
                ["worse", "Piorou"],
                ["resolved", "Foi resolvido"],
                ["different", "É outro problema"],
              ].map(([value, label]) => (
                <label key={value} className="border-2 p-3">
                  <input
                    required
                    type="radio"
                    name="observation_type"
                    value={value}
                  />{" "}
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-1 font-bold">
            Complemento privado opcional
            <textarea
              name="note"
              maxLength={600}
              rows={3}
              className="border-2 p-2"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button className="inline-flex min-h-11 items-center bg-comun-yellow px-4 font-black">
              Enviar para revisão
            </button>
            <Link
              className="inline-flex min-h-11 items-center font-bold underline"
              href={`/comun/mapa/contribuir?origem=calcadas&registro=${r.slug}`}
            >
              Enviar nova foto
            </Link>
          </div>
        </form>
        <p className="border-l-4 border-comun-yellow bg-comun-black p-4 text-white">
          Este registro pode ter contribuído para prioridades e encaminhamentos
          relacionados. O vínculo não prova causalidade isolada.
        </p>
      </section>
    </MiniAppExperienceShell>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 bg-white p-4">
      <strong className="text-xs">{label}</strong>
      <p>{value}</p>
    </div>
  );
}
function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-bold">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
