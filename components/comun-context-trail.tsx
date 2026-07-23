import Link from "next/link";

export type ComunContextNode = {
  kind: "território" | "comunidade" | "pauta" | "ferramenta" | "entidade";
  label: string;
  href?: string;
};

export function ComunContextTrail({
  items,
  tone = "dark",
}: {
  items: ComunContextNode[];
  tone?: "dark" | "light";
}) {
  const visible = items.filter((item) => item.label.trim());
  const mobile = visible.slice(-2);
  return (
    <>
      <nav
        aria-label="Contexto do processo"
        className={`mb-5 hidden overflow-x-auto text-xs font-bold [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:block ${tone === "dark" ? "text-comun-paper/80" : "text-comun-black"}`}
      >
        <ol className="flex min-w-max items-center gap-2">
          {visible.map((item, index) => {
            const content = (
              <>
                <span className="uppercase">{item.kind}</span>
                <span className="ml-1">{item.label}</span>
              </>
            );
            return (
              <li
                key={`${item.kind}-${item.label}`}
                className="flex items-center gap-2"
              >
                {index ? <span aria-hidden="true">→</span> : null}
                {item.href ? (
                  <Link
                    className="rounded-sm underline underline-offset-2 focus:outline focus:outline-2 focus:outline-comun-yellow"
                    href={item.href}
                  >
                    {content}
                  </Link>
                ) : (
                  <span aria-current="page">{content}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <details
        className={`mb-4 text-xs font-bold lg:hidden ${tone === "dark" ? "text-comun-paper" : "text-comun-black"}`}
      >
        <summary className="min-h-11 cursor-pointer list-none border-l-4 border-comun-yellow px-3 py-3">
          {mobile.map((item) => item.label).join(" · ")}{" "}
          <span className="ml-1 underline">Sobre este processo</span>
        </summary>
        <ol className="mt-2 grid gap-2 border-l-4 border-comun-yellow/40 pl-3">
          {visible.map((item) => (
            <li key={`${item.kind}-${item.label}`}>
              {item.href ? (
                <Link className="underline" href={item.href}>
                  {item.kind}: {item.label}
                </Link>
              ) : (
                <span aria-current="page">
                  {item.kind}: {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </details>
    </>
  );
}
