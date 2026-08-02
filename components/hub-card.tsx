import Link from "next/link";
/**
 * @deprecated Compatibilidade do fallback legado. Sob App V2, o shell aplica a
 * gramática semântica por família. Substituição de markup após o ensaio 47.9D.
 */
export function HubCard({
  href,
  label,
  title,
  summary,
  meta,
}: {
  href: string;
  label: string;
  title: string;
  summary?: string | null;
  meta?: string | null;
}) {
  return (
    <Link
      href={href}
      className="paper-panel block border-2 border-comun-black p-5"
    >
      <p className="text-xs font-black uppercase text-comun-rust">{label}</p>
      <h2 className="comun-prose mt-2 text-xl font-black uppercase">{title}</h2>
      {summary ? (
        <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">
          {summary}
        </p>
      ) : null}
      {meta ? (
        <p className="mt-4 text-xs font-black uppercase text-comun-asphalt/75">
          {meta}
        </p>
      ) : null}
    </Link>
  );
}
export function EmptyHub({ children }: { children: string }) {
  return (
    <p className="border-2 border-comun-yellow bg-comun-black p-4 text-sm text-comun-paper/75">
      {children}
    </p>
  );
}
