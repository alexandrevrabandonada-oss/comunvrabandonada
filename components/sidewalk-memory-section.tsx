import Link from "next/link";

export function SidewalkMemorySection({ pautaSlug, memories }: { pautaSlug: string; memories: { id: string; slug: string; title: string; public_summary: string }[] }) {
  if (!memories.length) return null;
  return (
    <section id="memoria" className="bg-comun-paper text-comun-black">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <h2 className="text-2xl font-black uppercase">Memória do ciclo</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {memories.map((memory) => (
            <Link key={memory.id} href={`/comun/pautas/${pautaSlug}/memoria/${memory.slug}`} className="paper-panel border-2 border-comun-black p-4">
              <h3 className="font-black uppercase">{memory.title}</h3>
              <p className="mt-2 text-sm text-comun-black/75">{memory.public_summary}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
