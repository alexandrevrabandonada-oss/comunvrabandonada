import { describe, expect, it } from "vitest";
import {
  canTransitionCollectiveAction,
  isSafePublicUrl,
  nextCollectiveAdministrativeStep,
  sanitizeCollectivePublicText,
} from "./collective-actions-admin";

describe("collective action administration contract", () => {
  it("allows only the action-to-memory state transitions", () => {
    expect(canTransitionCollectiveAction("draft", "open")).toBe(true);
    expect(canTransitionCollectiveAction("open", "awaiting_result")).toBe(true);
    expect(canTransitionCollectiveAction("awaiting_result", "completed")).toBe(true);
    expect(canTransitionCollectiveAction("completed", "active")).toBe(false);
  });

  it("sanitizes public text and refuses non-HTTPS assets", () => {
    expect(sanitizeCollectivePublicText("Fale com pessoa@example.com ou +55 (24) 99999-9999")).not.toMatch(/example\.com|99999/);
    expect(isSafePublicUrl("https://example.invalid/documento")).toBe(true);
    expect(isSafePublicUrl("http://example.invalid/documento")).toBe(false);
  });

  it("keeps the next administrative step intelligible", () => {
    expect(nextCollectiveAdministrativeStep({ status: "awaiting_result" })).toMatch(/resultado/);
    expect(nextCollectiveAdministrativeStep({ status: "completed", memory_summary: "ok" })).toMatch(/memória/i);
  });
});
