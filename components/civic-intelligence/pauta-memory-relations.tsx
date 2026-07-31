import Link from "next/link";
import { getStructuredCivicMemory } from "@/lib/civic-intelligence/memory";
import { getPublicRelatedContent } from "@/lib/civic-intelligence/related";

export async function PautaMemoryRelations({
  pautaId,
  title,
  route,
}: {
  pautaId: string;
  title: string;
  route: string;
}) {
  const [memory, related] = await Promise.all([
    getStructuredCivicMemory(pautaId),
    getPublicRelatedContent({ title, currentRoute: route, pautaId }),
  ]);
  if (!memory.length && !related.length) return null;
  return (
    <section
      className="border-y-2 border-comun-paper/25 py-8"
      aria-labelledby="civic-memory-title"
    >
      <h2
        id="civic-memory-title"
        className="text-2xl font-black uppercase text-comun-yellow"
      >
        Relações e memória viva
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-comun-paper/70">
        Relações públicas explicadas por pauta, estado e significado. Cada item
        abre sua fonte; nada é gerado sem evidência.
      </p>
      {memory.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {memory.slice(0, 4).map((item) => (
            <article
              className="border-2 border-comun-paper/30 p-4"
              key={`${item.route}-${item.question}`}
            >
              <p className="text-xs font-black uppercase text-comun-yellow">
                {item.label}
                {item.state ? ` · ${item.state}` : ""}
              </p>
              <h3 className="mt-2 font-black">
                <Link className="underline" href={item.route}>
                  {item.title}
                </Link>
              </h3>
              {item.date ? (
                <time
                  className="mt-2 block text-xs text-comun-paper/60"
                  dateTime={item.date}
                >
                  {new Date(item.date).toLocaleDateString("pt-BR")}
                </time>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
      {related.length ? (
        <div className="mt-6">
          <h3 className="font-black uppercase">Também se relaciona</h3>
          <ul className="mt-3 grid gap-2">
            {related.map((item) => (
              <li key={item.href}>
                <Link className="underline" href={item.href}>
                  {item.title}
                </Link>
                {item.matchReason ? (
                  <span className="text-sm text-comun-paper/60">
                    {" "}
                    · {item.matchReason}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
