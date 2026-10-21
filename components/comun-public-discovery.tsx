import Link from "next/link";
import {
  discoveryItemHref,
  discoveryReturnHref,
  type DiscoverySource,
} from "@/lib/comun-public-discovery";
export function DiscoveryReturn({
  query,
}: {
  query: { origem?: unknown; experiencia?: unknown; categoria?: unknown };
}) {
  const href = discoveryReturnHref(query);
  return href ? (
    <Link
      href={href}
      className="mb-5 inline-flex min-h-11 items-center font-bold underline focus-visible:outline focus-visible:outline-2"
    >
      Voltar à descoberta
    </Link>
  ) : null;
}
export function ComunPublicDiscovery({
  sources,
  experience,
  category,
}: {
  sources: DiscoverySource[];
  experience: string;
  category?: unknown;
}) {
  const groups = sources.filter(
    (source) =>
      source.state === "ready" &&
      source.items.length &&
      (!category || category === "tudo" || category === source.kind),
  );
  if (!groups.length) return null;
  return (
    <section
      aria-labelledby="public-discovery-heading"
      className="my-7 border-y border-current/25 py-6"
    >
      <h2 id="public-discovery-heading" className="text-2xl font-black">
        Para conhecer com calma
      </h2>
      <p className="mt-2 text-sm">
        Memória, escuta e trocas têm valor por si. Você pode explorar sem criar
        conta ou assumir uma tarefa.
      </p>
      {groups.map((group) => (
        <section
          key={group.kind}
          aria-label={
            { acervo: "Acervo", radio: "Rádio", feirinha: "Feirinha" }[
              group.kind
            ]
          }
          className="mt-5"
        >
          <h3 className="text-lg font-bold">
            {
              { acervo: "Acervo", radio: "Rádio", feirinha: "Feirinha" }[
                group.kind
              ]
            }
          </h3>
          <ul className="mt-2 grid gap-4 sm:grid-cols-2">
            {group.items.slice(0, 2).map((item) => (
              <li
                key={item.path}
                className="min-w-0 border border-current/25 p-4"
              >
                <h4 className="font-black">
                  <Link
                    href={discoveryItemHref(item.path, experience, category)}
                    className="inline-flex min-h-11 items-center underline focus-visible:outline focus-visible:outline-2"
                  >
                    {item.title}
                  </Link>
                </h4>
                <p className="mt-2 break-words text-sm">{item.summary}</p>
                <p className="mt-3 text-sm">{item.attribution}</p>
                {item.context ? (
                  <p className="text-sm">Contexto: {item.context}</p>
                ) : null}
                <p className="text-sm">
                  {item.dateLabel}:{" "}
                  <time dateTime={item.dateTime}>
                    {new Date(item.dateTime).toLocaleDateString("pt-BR", {
                      timeZone: "UTC",
                    })}
                  </time>
                </p>
                <p className="mt-2 text-xs">{item.rights}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {sources.some((source) => source.state === "unavailable") ? (
        <p role="status" className="mt-4 text-sm">
          Algumas fontes estão temporariamente indisponíveis. Os itens acima vêm
          das fontes que puderam ser verificadas.
        </p>
      ) : null}
    </section>
  );
}
