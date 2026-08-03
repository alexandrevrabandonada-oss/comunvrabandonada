import { describe, expect, it } from "vitest";
import {
  createRelataPreview,
  sanitizeRelataLogEvent,
} from "./comun-relata-preview";
import { routeRelata } from "./comun-relata-routing";

describe("COMUN Relata local preview", () => {
  it("creates a COMUN-only protocol without official forwarding", () => {
    const decision = routeRelata({ text: "A luminária da rua está apagada" });
    const preview = createRelataPreview(
      { text: "A luminária da rua está apagada" },
      decision,
    );
    expect(preview.submission.protocol.kind).toBe("comun");
    expect(preview.submission.protocol.isOfficial).toBe(false);
    expect(preview.submission.protocol.officialProtocol).toBeNull();
    expect(preview.noOfficialSend).toBe(true);
    expect(preview.submission.localOnly).toBe(true);
  });

  it("keeps PII out of preview logs", () => {
    const clean = sanitizeRelataLogEvent({
      category: "public_lighting",
      text: "email pessoa@example.com",
      latitude: -22,
      code: "pessoa@example.com",
      protocol: "COMUN-RELATA-0123456789ABCDEF",
    });
    expect(clean).toEqual({ category: "public_lighting" });
  });
});
