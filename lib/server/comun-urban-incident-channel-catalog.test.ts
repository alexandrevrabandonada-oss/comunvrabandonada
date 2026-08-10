import { describe, expect, it } from "vitest";
import { COMUN_URBAN_INCIDENT_CHANNEL_CATALOG } from "./comun-urban-incident-channel-catalog";

describe("COMUN P6B-B institutional evidence catalog", () => {
  it("contains only verified, unchecked, non-automated official sources", () => {
    expect(COMUN_URBAN_INCIDENT_CHANNEL_CATALOG.length).toBeGreaterThanOrEqual(6);
    for (const channel of COMUN_URBAN_INCIDENT_CHANNEL_CATALOG) {
      expect(channel.sourceUrl).toMatch(/^https:\/\/(www\.)?(servicos\.)?voltaredonda\.rj\.gov\.br\//);
      expect(channel.sourceStatus).toBe("source_verified");
      expect(channel.operationalStatus).toBe("operationally_unchecked");
      expect(channel.automationAllowed).toBe(false);
    }
  });

  it("covers emergency, drainage, watercourse and tree references", () => {
    const ids = COMUN_URBAN_INCIDENT_CHANNEL_CATALOG.map((item) => item.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "pmvr-defesa-civil-199",
        "pmvr-smi-drainage-162",
        "pmvr-smi-watercourses-147",
        "pmvr-smma-fallen-tree-143",
        "pmvr-smma-tree-evaluation-196",
        "pmvr-fiscaliza-reference-435",
      ]),
    );
  });
});
