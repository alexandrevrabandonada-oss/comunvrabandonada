import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  solidarityConnectionDraftOwner,
  solidarityConnectionFormIdentity,
} from "./server/comun-solidarity-private-connections";
describe("server-derived private draft identity", () => {
  const a = { id: "synthetic-a", last_sign_in_at: "2026-10-14T12:00:00Z" };
  it("does not expose the auth identity and remains stable only within the same login", () => {
    expect(solidarityConnectionDraftOwner(a)).toMatch(/^[a-f0-9]{64}$/);
    expect(solidarityConnectionDraftOwner(a)).toBe(
      solidarityConnectionDraftOwner({ ...a }),
    );
    expect(
      solidarityConnectionDraftOwner({ ...a, id: "synthetic-b" }),
    ).not.toBe(solidarityConnectionDraftOwner(a));
    expect(
      solidarityConnectionDraftOwner({
        ...a,
        last_sign_in_at: "2026-10-14T12:01:00Z",
      }),
    ).not.toBe(solidarityConnectionDraftOwner(a));
  });
  it("disables persistence without authenticated login evidence, while keeping account form isolation", () => {
    expect(solidarityConnectionDraftOwner(null)).toBeNull();
    expect(solidarityConnectionDraftOwner({ id: a.id })).toBeNull();
    expect(solidarityConnectionFormIdentity({ id: a.id })).not.toBeNull();
    expect(solidarityConnectionFormIdentity({ id: "synthetic-b" })).not.toBe(
      solidarityConnectionFormIdentity(a),
    );
  });
});
