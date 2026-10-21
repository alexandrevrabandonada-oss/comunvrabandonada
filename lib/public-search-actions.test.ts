import { it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw Error("REDIRECT");
  }),
}));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
import { submitPublicSearch } from "@/app/comun/buscar/actions";
it("public form redirects only after validation, without a database or mutation", async () => {
  const form = new FormData();
  form.set("q", "cultura");
  form.set("tipo", "memória");
  await expect(submitPublicSearch(form)).rejects.toThrow("REDIRECT");
  expect(m.redirect).toHaveBeenLastCalledWith(
    "/comun/buscar?q=cultura&tipo=mem%C3%B3ria",
  );
  form.set("q", "pessoa@example.invalid");
  await expect(submitPublicSearch(form)).rejects.toThrow("REDIRECT");
  expect(m.redirect).toHaveBeenLastCalledWith(
    "/comun/buscar?aviso=consulta-nao-publica",
  );
});
