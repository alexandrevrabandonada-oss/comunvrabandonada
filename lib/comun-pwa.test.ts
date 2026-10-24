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
  it("activation removes obsolete v3 caches while preserving the v4 shell and unrelated caches", async () => {
    const listeners = new Map<
      string,
      (event: { waitUntil(promise: Promise<unknown>): void }) => void
    >();
    const deleted: string[] = [];
    runInNewContext(
      readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"),
      {
        self: {
          addEventListener(
            name: string,
            callback: (event: {
              waitUntil(promise: Promise<unknown>): void;
            }) => void,
          ) {
            listeners.set(name, callback);
          },
          clients: { claim: async () => undefined },
        },
        caches: {
          keys: async () => [
            "comun-pwa-v3-public",
            "comun-pwa-v3-shell",
            "comun-pwa-v4-public",
            "comun-pwa-v4-shell",
            "other-app",
          ],
          delete: async (key: string) => {
            deleted.push(key);
            return true;
          },
        },
      },
    );
    let completion: Promise<unknown> = Promise.resolve();
    listeners.get("activate")!({
      waitUntil(promise) {
        completion = promise;
      },
    });
    await completion;
    expect(deleted.sort()).toEqual([
      "comun-pwa-v3-public",
      "comun-pwa-v3-shell",
    ]);
  });
  it("never remembers or caches private community descendants, including encoded paths", () => {
    const worker = readFileSync(
      new URL("../public/sw.js", import.meta.url),
      "utf8",
    );
    for (const [path, allowed] of [
      ["/comun/c/cidade", true],
      ["/comun/c/cidade/agenda", true],
      ["/comun/c/cidade/mesa", false],
      ["/comun/c/cidade/mesa/", false],
      ["/comun/c/cidade/participar", false],
      ["/comun/c/cidade/%6desa", false],
      ["/comun/c/cidade/mesa/../mesa", false],
      ["/comun/c/cidade/reservado", false],
    ] as const) {
      expect(isSafeComunRoute(path), path).toBe(allowed);
      const result = runInNewContext(
        worker + "\nisPublicPage(new URL(path, 'https://comun.invalid'))",
        {
          URL,
          path,
          self: {
            location: { origin: "https://comun.invalid" },
            addEventListener() {},
          },
        },
      );
      expect(result, path).toBe(allowed);
    }
  });
  it("accepts only allowlisted public paths without query or fragment", () => {
    expect(isSafeComunRoute("/comun/pautas/calcadas-em-circulacao")).toBe(true);
    expect(isSafeComunRoute("/comun/seguranca")).toBe(true);
    expect(isSafeComunRoute("/comun/buscar?q=contato-privado")).toBe(false);
    expect(isSafeComunRoute("/comun/minha-participacao")).toBe(false);
    expect(isSafeComunRoute("/comun/admin/operacao")).toBe(false);
    expect(isSafeComunRoute("https://example.org/comun/pautas/x")).toBe(false);
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
