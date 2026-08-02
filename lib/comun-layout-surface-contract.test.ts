import { describe, expect, it } from "vitest";
import {
  COMUN_LAYOUT_SURFACE_CONTRACTS,
  COMUN_SEMANTIC_LAYOUT_TOKENS,
} from "./comun-layout-surface-contract";

describe("contrato semântico de layout e superfície", () => {
  it("classifica os sete shells sem combinações ambíguas", () => {
    expect(Object.keys(COMUN_LAYOUT_SURFACE_CONTRACTS)).toHaveLength(7);
    expect(COMUN_LAYOUT_SURFACE_CONTRACTS.member_root).toMatchObject({
      tone: "light",
      text: "ink",
      action: "rust",
    });
    expect(COMUN_LAYOUT_SURFACE_CONTRACTS.auth.tone).toBe("light");
    expect(COMUN_LAYOUT_SURFACE_CONTRACTS.admin).toMatchObject({
      tone: "dark",
      text: "paper",
      action: "yellow",
    });
  });

  it("mantém tokens semânticos e altura efetiva da navegação", () => {
    expect(COMUN_SEMANTIC_LAYOUT_TOKENS).toEqual(
      expect.arrayContaining([
        "--comun-text-primary",
        "--comun-text-secondary",
        "--comun-surface-page",
        "--comun-bottom-nav-effective-height",
      ]),
    );
  });
});
