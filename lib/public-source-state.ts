export type PublicSourceState = "ready" | "empty" | "unavailable";
export type PublicSourceRead<T> = { state: PublicSourceState; items: T[] };
export function publicSourceItems<T>(items: T[]): PublicSourceRead<T> {
  return { state: items.length ? "ready" : "empty", items };
}
export function unavailablePublicSource<T>(): PublicSourceRead<T> {
  return { state: "unavailable", items: [] };
}
