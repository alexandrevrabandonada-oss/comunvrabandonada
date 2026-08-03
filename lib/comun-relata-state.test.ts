import { describe, expect, it } from "vitest";
import {
  assertRelataTransition,
  canTransitionRelata,
} from "./comun-relata-state";

describe("COMUN Relata durable state machine", () => {
  it("allows the local private path and withdrawal", () => {
    expect(canTransitionRelata("draft", "triage")).toBe(true);
    expect(canTransitionRelata("triage", "routed")).toBe(true);
    expect(canTransitionRelata("routed", "stored_private")).toBe(true);
    expect(canTransitionRelata("stored_private", "withdrawn")).toBe(true);
  });

  it("keeps future and reversed paths unreachable", () => {
    expect(canTransitionRelata("draft", "stored_private")).toBe(false);
    expect(canTransitionRelata("withdrawn", "triage")).toBe(false);
    expect(() => assertRelataTransition("withdrawn", "stored_private")).toThrow(
      "COMUN_RELATA_INVALID_STATE_TRANSITION",
    );
  });
});
