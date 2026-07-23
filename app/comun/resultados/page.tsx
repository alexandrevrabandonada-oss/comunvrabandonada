import { ComunShell, Section } from "@/components/comun-shell";
import { HubCard, EmptyHub } from "@/components/hub-card";
import { listPublicResults } from "@/lib/central-hub";
import { comunCanonicalRoutes } from "@/lib/comun-canonical-routes";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ resultado?: string }>;
}) {
  const selected = (await searchParams).resultado;
  const rows = await listPublicResults();
  return (
    <ComunShell>
      <Section>
        <h1 className="text-4xl font-black uppercase text-comun-yellow">
          Resultados e prestação de contas
        </h1>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          O que foi feito, o que mudou e o que ainda falta. Promessa é
          identificada como promessa, nunca como conquista.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {rows.map((x: any) => (
            <div
              key={x.id}
              id={`resultado-${x.slug}`}
              className={
                selected === x.slug
                  ? "outline outline-4 outline-comun-yellow outline-offset-4"
                  : ""
              }
            >
              <HubCard
                href={comunCanonicalRoutes.result(x.slug)}
                label={`${x.result_type} · ${x.verification_status}`}
                title={x.title}
                summary={x.public_summary}
                meta={new Date(x.occurred_at).toLocaleDateString("pt-BR")}
              />
            </div>
          ))}
        </div>
        {!rows.length ? (
          <EmptyHub>Nenhum resultado público registrado ainda.</EmptyHub>
        ) : null}
      </Section>
    </ComunShell>
  );
}
