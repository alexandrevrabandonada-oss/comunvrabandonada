import { describe, expect, it } from "vitest";
import { resolveComunProtocol } from "./comun-protocol";

describe("canonical protocol resolver", () => {
  it("recognizes legacy and Relata protocols without rewriting them", () => {
    expect(resolveComunProtocol("COMUN-20260804-123456")).toMatchObject({ origin: "legacy", canonical: "COMUN-20260804-123456", valid: true });
    expect(resolveComunProtocol("COMUN-RELATA-ABCDEF0123456789")).toMatchObject({ origin: "relata", canonical: "COMUN-RELATA-ABCDEF0123456789", valid: true });
  });

  it("does not accept official or malformed aliases", () => {
    expect(resolveComunProtocol("OFICIAL-123").valid).toBe(false);
    expect(resolveComunProtocol("COMUN-RELATA-xyz").valid).toBe(false);
  });
});
