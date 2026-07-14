import { describe, expect, it } from "vitest";
import { alertFingerprint, calculateWorkerState } from "./worker-health-rules";
describe("worker health", () => {
  it("deduplica fingerprint", () =>
    expect(alertFingerprint("x", "1")).toBe(alertFingerprint("x", "1")));
  it("classifica saude", () => {
    expect(
      calculateWorkerState({
        lastAge: 10,
        dead: 0,
        stale: 0,
        queued: 0,
        oldestAge: 0,
        cleanup: 0,
      }),
    ).toBe("healthy");
    expect(
      calculateWorkerState({
        lastAge: 70,
        dead: 0,
        stale: 0,
        queued: 0,
        oldestAge: 0,
        cleanup: 0,
      }),
    ).toBe("critical");
  });
});
