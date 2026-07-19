import { describe, expect, it } from "vitest";
import { communityStatusLabel, communityStatusPriority } from "./community-status";

describe("linguagem comum da jornada", () => {
  it("mapeia estados legados sem alterar o banco", () => {
    expect(communityStatusLabel("under_review")).toBe("Em revisão");
    expect(communityStatusLabel("needs_more_info")).toBe("Precisa de complemento");
    expect(communityStatusLabel("archived")).toBe("Preservado na memória");
  });
  it("ordena atenção antes de andamento e conclusão", () => {
    expect(communityStatusPriority("blocked")).toBeGreaterThan(communityStatusPriority("in_progress"));
    expect(communityStatusPriority("in_progress")).toBeGreaterThan(communityStatusPriority("completed"));
  });
});
