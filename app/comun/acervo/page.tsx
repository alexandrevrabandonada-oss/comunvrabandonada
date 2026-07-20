import Link from "next/link";
import Image from "next/image";
import { ComunShell, Section } from "@/components/comun-shell";
import { archiveDate, listPublicArchiveItems } from "@/lib/archive";
export const dynamic = "force-dynamic";
export default async function ArchivePage(props: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    city?: string;
    neighborhood?: string;
    from?: string;
    to?: string;
    place?: string;
    decade?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const items = await listPublicArchiveItems(searchParams);
  return (
    <ComunShell>
      <Section>
        <p className="font-black uppercase text-comun-yellow">Acervo vivo</p>
        <h1 className="mt-2 text-4xl font-black uppercase text-comun-paper">
          Memória viva da cidade
        </h1>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          Fotografias, documentos, lugares, artistas e coleções publicados com
          revisão de fonte, direitos e privacidade.
        </p>
        <div className="mt-5 border-2 border-comun-yellow bg-comun-yellow p-5 text-comun-black">
          <h2 className="text-2xl font-black uppercase">Ajude a identificar fotografias antigas</h2>
          <p className="mt-2 max-w-2xl">Veja memórias ainda sem legenda confirmada e conte o que você reconhece. Toda contribuição passa por revisão.</p>
          <Link href="/comun/acervo/identificar" className="mt-4 inline-flex min-h-11 items-center bg-comun-black px-4 font-black uppercase text-comun-paper">Abrir memórias em identificação</Link>
        </div>
        <Link
          href="/comun/acervo/contribuir"
          className="mt-5 inline-flex border-2 border-comun-yellow px-4 py-3 font-black uppercase text-comun-yellow"
        >
          Enviar fotografia historica
        </Link>
        <Link href="/comun/acervo/artistas" className="ml-3 mt-5 inline-flex border-2 border-comun-yellow px-4 py-3 font-black uppercase text-comun-yellow">Conhecer artistas locais</Link>
        <div className="mt-6 border-2 border-comun-yellow p-4 text-comun-paper"><h2 className="text-2xl font-black uppercase">Som da nossa região</h2><p className="mt-2 max-w-2xl text-comun-paper/75">Artistas, discografias e coleções editoriais documentados com fontes, direitos e links oficiais.</p><div className="mt-3 flex gap-4"><Link href="/comun/acervo/artistas" className="font-black uppercase text-comun-yellow">Artistas</Link><Link href="/comun/acervo/musica" className="font-black uppercase text-comun-yellow">Lançamentos</Link><Link href="/comun/acervo/colecoes" className="font-black uppercase text-comun-yellow">Coleções</Link></div></div>
        <Link
          href="/comun/acervo/direitos-e-remocao"
          className="ml-3 mt-5 inline-flex px-4 py-3 font-black uppercase text-comun-yellow underline"
        >
          Direitos e remocao
        </Link>
        <form className="mt-6 grid gap-2 border-2 border-comun-yellow bg-comun-black p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Buscar no acervo"
            className="min-h-11 bg-comun-paper px-3 text-comun-black lg:col-span-2"
          />
          <select
            name="type"
            aria-label="Tipo de item do acervo"
            defaultValue={searchParams.type}
            className="min-h-11 bg-comun-paper px-2 text-comun-black"
          >
            <option value="">Todos os tipos</option>
            {[
              "photograph",
              "document",
              "place",
              "artist",
              "music_release",
              "oral_history",
              "poster",
              "newspaper",
              "other",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input
            name="city"
            defaultValue={searchParams.city}
            placeholder="Cidade"
            className="min-h-11 bg-comun-paper px-3 text-comun-black"
          />
          <input
            name="neighborhood"
            defaultValue={searchParams.neighborhood}
            placeholder="Bairro"
            className="min-h-11 bg-comun-paper px-3 text-comun-black"
          />
          <input
            name="place"
            defaultValue={searchParams.place}
            placeholder="Lugar"
            className="min-h-11 bg-comun-paper px-3 text-comun-black"
          />
          <input
            name="decade"
            type="number"
            step="10"
            defaultValue={searchParams.decade}
            placeholder="Decada"
            className="min-h-11 bg-comun-paper px-3 text-comun-black"
          />
          <input
            name="from"
            type="number"
            defaultValue={searchParams.from}
            placeholder="Ano inicial"
            className="min-h-11 bg-comun-paper px-3 text-comun-black"
          />
          <input
            name="to"
            type="number"
            defaultValue={searchParams.to}
            placeholder="Ano final"
            className="min-h-11 bg-comun-paper px-3 text-comun-black"
          />
          <button className="min-h-11 bg-comun-yellow px-4 font-black uppercase text-comun-black">
            Filtrar
          </button>
        </form>
        <div className="mt-4 flex gap-3">
          <Link
            href="/comun/acervo/colecoes"
            className="font-black uppercase text-comun-yellow"
          >
            Ver coleções
          </Link>
          <span className="text-comun-paper/50">
            {items.length} resultado(s)
          </span>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const asset = item.assets.find((a) => a.public_url);
            return (
              <Link
                href={`/comun/acervo/${item.slug}`}
                key={item.id}
                className="paper-panel overflow-hidden border-2 border-comun-black"
              >
                {asset?.public_url && asset.mime_type?.startsWith("image/") ? (
                  <Image
                    src={asset.public_url}
                    alt={asset.alt_text ?? ""}
                    width={800}
                    height={600}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-comun-asphalt text-sm font-black uppercase text-comun-paper/60">
                    {item.item_type}
                  </div>
                )}
                <div className="p-4">
                  <p className="text-xs font-black uppercase text-comun-rust">
                    {item.item_type} · {archiveDate(item)}
                  </p>
                  <h2 className="mt-2 text-xl font-black uppercase">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm text-comun-asphalt/70">
                    {[item.place_name, item.neighborhood, item.city]
                      .filter(Boolean)
                      .join(" · ") || "Local não informado"}
                  </p>
                  {item.credits ? (
                    <p className="mt-2 text-xs font-bold">
                      Créditos: {item.credits}
                    </p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
        {!items.length ? (
          <p className="mt-6 border-2 border-comun-yellow p-5 text-comun-paper/75">
            Nenhum item publicado corresponde aos filtros.
          </p>
        ) : null}
        {items.length === 24 ? (
          <Link
            href={`/comun/acervo?${new URLSearchParams({ ...Object.fromEntries(Object.entries(searchParams).filter(([, v]) => v)), page: String((Number(searchParams.page) || 1) + 1) }).toString()}`}
            className="mt-8 inline-flex border-2 border-comun-yellow px-4 py-3 font-black uppercase text-comun-yellow"
          >
            Carregar mais resultados
          </Link>
        ) : null}
      </Section>
    </ComunShell>
  );
}
