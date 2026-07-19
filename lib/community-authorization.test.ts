import { describe, expect, it } from "vitest";
import { communityRoleCapabilities } from "./community-authorization";
describe("community capabilities", () => {
  it("não transforma acompanhamento em papel", () => {
    expect(communityRoleCapabilities("facilitator")).toEqual([
      "facilitate_circle",
    ]);
    expect(communityRoleCapabilities("coordinator")).not.toContain(
      "edit_community",
    );
  });
  it("mantém capacidade de campo limitada", () => {
    expect(communityRoleCapabilities("field_observer")).toEqual([
      "record_field_observation",
    ]);
  });
});
