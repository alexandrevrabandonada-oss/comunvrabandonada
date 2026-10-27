/**
 * Presentation-only state. This never turns a failed source into a verified
 * empty result, and never claims that categories contain published items.
 */
export type DiscoveryPresentationSource = {
  kind: "acervo" | "radio" | "feirinha";
  state: "ready" | "empty" | "unavailable";
  items: readonly unknown[];
};

export function summarizeDiscoveryPresentation<T extends DiscoveryPresentationSource>(
  sources: readonly T[],
  category?: unknown,
) {
  const relevant = sources.filter(
    (source) =>
      category == null || category === "tudo" || category === source.kind,
  );
  const groups = relevant.filter(
    (source) => source.state === "ready" && source.items.length > 0,
  );
  const unavailable = relevant.some((source) => source.state === "unavailable");
  const state =
    relevant.length === 0
      ? "not_applicable"
      : groups.length > 0
        ? "ready"
        : unavailable
          ? "unavailable"
          : "empty";
  return { groups, state, unavailable } as const;
}
