"use server";
import { redirect } from "next/navigation";
import { normalizeSearchState, searchHref } from "@/lib/public-search-context";
// Public navigation only: no auth, database call, logging, metric or mutation.
export async function submitPublicSearch(form: FormData) {
  const state = normalizeSearchState(
    Object.fromEntries(
      ["q", "tipo", "pauta", "territorio", "experiencia", "semantic"].map(
        (k) => [k, form.get(k) ?? ""],
      ),
    ),
  );
  redirect(
    state ? searchHref(state) : "/comun/buscar?aviso=consulta-nao-publica",
  );
}
