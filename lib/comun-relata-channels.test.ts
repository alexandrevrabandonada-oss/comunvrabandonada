import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  canUseRelataChannelAsIntegration,
  RELATA_CHANNELS,
  RELATA_OFFICIAL_SOURCES,
} from "./comun-relata-channels";

describe("COMUN Relata institutional catalog", () => {
  it("pins normalized hashes for official HTTPS sources", () => {
    for (const source of RELATA_OFFICIAL_SOURCES) {
      expect(source.url).toMatch(/^https:\/\//);
      const normalized = {
        id: source.id,
        title: source.title,
        url: source.url,
        publisher: source.publisher,
        sourcePublishedAt: source.sourcePublishedAt,
        accessedAt: source.accessedAt,
      };
      expect(source.normalizedSha256).toBe(
        createHash("sha256").update(JSON.stringify(normalized)).digest("hex"),
      );
    }
  });

  it("keeps source verification separate from operational verification", () => {
    expect(RELATA_CHANNELS.every((channel) => channel.sourceVerified)).toBe(
      true,
    );
    expect(
      RELATA_CHANNELS.every((channel) => !channel.operationallyChecked),
    ).toBe(true);
    expect(
      RELATA_CHANNELS.every(
        (channel) => !canUseRelataChannelAsIntegration(channel),
      ),
    ).toBe(true);
  });

  it("preserves official conflicts instead of selecting a unique contact", () => {
    const conflicts = RELATA_CHANNELS.filter(
      (channel) => channel.sourceConflict,
    );
    expect(conflicts.map((channel) => channel.id)).toEqual(
      expect.arrayContaining([
        "vr-cau-whatsapp-conflict",
        "light-call-center-conflict",
      ]),
    );
    expect(
      conflicts.every(
        (channel) =>
          channel.operationalStatus === "conflicting_official_sources",
      ),
    ).toBe(true);
  });

  it("keeps emergency immediate, non-queueable and non-automated", () => {
    const emergency = RELATA_CHANNELS.find(
      (channel) => channel.id === "cbmerj-193",
    )!;
    expect(emergency).toMatchObject({
      channelValue: "193",
      emergency: true,
      immediateAssistedAction: true,
      queueable: false,
      automationAllowed: false,
      protocolExpectation: "not_promised",
    });
  });

  it("requires earlier protocols for the Light ombudsman and ANEEL", () => {
    for (const id of ["light-ouvidoria", "aneel-escalation"]) {
      expect(
        RELATA_CHANNELS.find((channel) => channel.id === id)
          ?.priorProtocolRequired,
      ).toBe(true);
    }
  });
});
