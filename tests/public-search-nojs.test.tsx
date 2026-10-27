import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LiveSearchResults } from "@/components/civic-intelligence/live-search-results";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("public search without JavaScript", () => {
  it("does not report ongoing verification when the initial source is unavailable", () => {
    const html = renderToStaticMarkup(
      <LiveSearchResults
        query="livros"
        initialResults={[]}
        lexicalDurationMs={0}
        initialAvailability="unavailable"
      />,
    );
    expect(html).toContain("display: none !important");
    expect(html).toContain("Busca indisponível");
  });

  it("renders only safe initial results once with a contextual return", () => {
    const html = renderToStaticMarkup(
      <LiveSearchResults
        query="cultura"
        initialAvailability="ready"
        lexicalDurationMs={12}
        initialResults={[
          {
            type: "memória",
            title: "Memória local",
            summary: null,
            href: "/comun/acervo/memoria-local",
            origin: "Acervo",
            score: 1,
          },
          {
            type: "memória",
            title: "Destino externo",
            summary: null,
            href: "https://evil.invalid",
            origin: "Acervo",
            score: 1,
          },
        ]}
      />,
    );
    expect(html.match(/Memória local/g)).toHaveLength(1);
    expect(html).toContain("busca=");
    expect(html).not.toContain("Destino externo");
  });
});
