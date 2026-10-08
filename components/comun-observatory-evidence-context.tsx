import Link from "next/link";
import type { ObservatoryEvidenceProjection } from "@/lib/comun-specialized-observatory-projection";

export function ObservatoryEvidenceContext({
  projection,
  sourcesPath,
}: {
  projection: ObservatoryEvidenceProjection;
  sourcesPath: string;
}) {
  return (
    <section
      data-comun-observatory-evidence
      className="mt-5 border-l-4 border-comun-yellow bg-comun-paper p-4 text-sm"
      aria-label="Contexto público da evidência"
    >
      <p data-comun-public-summary>{projection.summary}</p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="font-bold">Território</dt>
          <dd>{projection.territory}</dd>
        </div>
        <div>
          <dt className="font-bold">Período da fonte</dt>
          <dd>{projection.period}</dd>
        </div>
        <div>
          <dt className="font-bold">{projection.dateLabel}</dt>
          <dd>{projection.retrievedAt ?? "Data não informada pela fonte"}</dd>
        </div>
        <div>
          <dt className="font-bold">Fontes públicas</dt>
          <dd>
            {projection.sources.map((source, i) => (
              <span key={`${source.url}-${i}`}>
                {i ? " · " : ""}
                <a href={source.url}>{source.publisher}</a>
              </span>
            ))}
          </dd>
        </div>
      </dl>
      <details className="mt-3">
        <summary className="cursor-pointer font-bold">
          Limites desta evidência
        </summary>
        <ul className="mt-2 list-disc pl-5">
          {projection.limitations.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </details>
      <nav
        className="mt-3 flex flex-wrap gap-4"
        aria-label="Consultar e continuar"
      >
        <Link href={sourcesPath}>Consultar fontes e metodologia</Link>
        <Link href="/comun/observatorios">Voltar aos observatórios</Link>
      </nav>
    </section>
  );
}
