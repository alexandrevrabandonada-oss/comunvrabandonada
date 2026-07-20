import { permanentRedirect } from "next/navigation";

export const artworkHref = (slug?: string) =>
  slug ? `/comun/acervo/arte/${slug}` : "/comun/acervo/arte";

export function permanentArtworkRedirect(
  target: string,
  searchParams: Record<string, string | string[] | undefined> = {},
): never {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item) query.append(key, item);
    }
  }
  permanentRedirect(`${target}${query.size ? `?${query}` : ""}`);
}
