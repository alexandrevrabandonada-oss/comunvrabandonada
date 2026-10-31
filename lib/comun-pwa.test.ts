import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import {
  isSafeComunRoute,
  readComunOptionalStorage,
  removeComunOptionalStorage,
  writeComunOptionalStorage,
} from "./comun-pwa";

describe("PWA public offline boundary", () => {
  it("accepts only allowlisted public paths without query or fragment", () => {
    expect(isSafeComunRoute("/comun/pautas/calcadas-em-circulacao")).toBe(true);
    expect(isSafeComunRoute("/comun/seguranca")).toBe(true);
    expect(isSafeComunRoute("/comun/buscar?q=contato-privado")).toBe(false);
    expect(isSafeComunRoute("/comun/minha-participacao")).toBe(false);
    expect(isSafeComunRoute("/comun/admin/operacao")).toBe(false);
    expect(isSafeComunRoute("https://example.org/comun/pautas/x")).toBe(false);
    expect(isSafeComunRoute("/comun/c/vila-brasilia")).toBe(true);
    expect(isSafeComunRoute("/comun/c/vila-brasilia/agenda")).toBe(true);
    for (const route of [
      "/comun/c/vila-brasilia/mesa",
      "/comun/c/vila-brasilia/integrantes",
      "/comun/c/vila-brasilia/admin",
      "/comun/c/Vila-Brasilia",
      "//example.org/comun/c/vila-brasilia",
      "/comun/c/vila-brasilia?private=1",
    ]) {
      expect(isSafeComunRoute(route)).toBe(false);
    }
  });
});

// Execute the real service-worker route predicate rather than relying on a
// string search. No browser, remote HTTP request, cookie or service account.
const workerSource = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
function serviceWorkerAllowsOffline(url: string): boolean {
  const origin = "https://comunsocial.online";
  const program =
    workerSource +
    `\nisPublicPage(new URL(${JSON.stringify(url)}, ${JSON.stringify(origin)}))`;
  return runInNewContext(program, {
    URL,
    self: {
      location: { origin },
      addEventListener: () => undefined,
    },
  }) as boolean;
}

describe("T1: offline public cache classifier is fail-closed", () => {
  const publicPages = [
    "/comun/pautas",
    "/comun/pautas/rota-acessivel",
    "/comun/acoes/acao-local",
    "/comun/radio/episodios/episodio-publico",
    "/comun/acervo/documento-publico",
    "/comun/c/vila-brasilia",
    "/comun/c/vila-brasilia/agenda",
    "/comun/seguranca",
    "/comun/ajuda",
  ];
  const rejected = [
    "/comun/acoes-privadas",
    "/comun/pautas-internas",
    "/comun/radiointerno",
    "/comun/seguranca-administrativa",
    "/comun/ajudaextra",
    "/comun/c/vila-brasilia/admin",
    "/comun/c/vila-brasilia/mesa",
    "/comun/c/vila-brasilia/integrantes",
    "/comun/c/vila-brasilia/agenda/privado",
    "/comun/c/Vila-Brasilia",
    "/comun/minha-participacao",
    "/comun/caixa-de-entrada",
    "/comun/admin",
    "/comun/conta",
    "/comun/acoes/acao-local?token=private",
    "/comun/pautas#fragment",
    "/comun/buscar?q=nome",
    "https://outside.example/comun/pautas",
  ];

  it.each(publicPages)("keeps ordinary public offline routes: %s", (path) => {
    expect(isSafeComunRoute(path)).toBe(true);
    expect(serviceWorkerAllowsOffline(path)).toBe(true);
  });

  it.each(rejected)("never classifies a private, ambiguous or unsafe route as public: %s", (path) => {
    expect(isSafeComunRoute(path)).toBe(false);
    expect(serviceWorkerAllowsOffline(path)).toBe(false);
  });

  it("rotates the old cache namespace, without disabling the activation cleanup", () => {
    expect(workerSource).toContain('const VERSION = "comun-pwa-v4"');
    expect(workerSource).toContain('key.startsWith("comun-pwa-")');
    expect(workerSource).toContain('![SHELL_CACHE, PUBLIC_CACHE].includes(key)');
  });
});

describe("optional PWA storage", () => {
  it("distinguishes an empty accessible store from denied storage", () => {
    const values = new Map<string, string>();
    const resolve = () => ({
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    });

    expect(readComunOptionalStorage(resolve, "route")).toEqual({
      available: true,
      value: null,
    });
    const routeWritten = writeComunOptionalStorage(
      resolve,
      "route",
      "/comun/acervo",
    );
    expect(routeWritten).toBe(true);
    expect(readComunOptionalStorage(resolve, "route")).toEqual({
      available: true,
      value: "/comun/acervo",
    });
    expect(removeComunOptionalStorage(resolve, "route")).toBe(true);
    expect(readComunOptionalStorage(resolve, "route").value).toBeNull();
  });

  it("fails closed if the storage getter or methods throw", () => {
    const denied = () => {
      throw new DOMException("Storage denied", "SecurityError");
    };
    expect(readComunOptionalStorage(denied, "route")).toEqual({
      available: false,
      value: null,
    });
    expect(writeComunOptionalStorage(denied, "route", "/comun")).toBe(false);
    expect(removeComunOptionalStorage(denied, "route")).toBe(false);

    const throwingStore = () => ({
      getItem: (_key: string): string | null => {
        throw new Error("Storage denied");
      },
      setItem: (_key: string, _value: string) => {
        throw new Error("Storage denied");
      },
      removeItem: (_key: string) => {
        throw new Error("Storage denied");
      },
    });
    const deniedRead = readComunOptionalStorage(throwingStore, "route");
    const deniedWrite = writeComunOptionalStorage(
      throwingStore,
      "route",
      "/comun",
    );
    expect(deniedRead.available).toBe(false);
    expect(deniedWrite).toBe(false);
    expect(removeComunOptionalStorage(throwingStore, "route")).toBe(false);
  });
});
