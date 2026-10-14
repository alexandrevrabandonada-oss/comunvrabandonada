import { describe, expect, it } from "vitest";
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
    expect(
      writeComunOptionalStorage(resolve, "route", "/comun/acervo"),
    ).toBe(true);
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
    expect(readComunOptionalStorage(throwingStore, "route").available).toBe(
      false,
    );
    expect(
      writeComunOptionalStorage(throwingStore, "route", "/comun"),
    ).toBe(false);
    expect(removeComunOptionalStorage(throwingStore, "route")).toBe(false);
  });
});
