import { describe, expect, it } from "vitest";
import {
  canPrepareSidewalkForwarding,
  classifySidewalkJurisdiction,
  SIDEWALK_SERVICE_ADAPTER,
} from "./comun-sidewalk-relata-connection";

describe("sidewalk/Relata connection contract", () => {
  it("keeps responsibility and service estimates explicit", () => {
    expect(SIDEWALK_SERVICE_ADAPTER.institution).toContain("Infraestrutura");
    expect(SIDEWALK_SERVICE_ADAPTER.inspectionEstimateDays).toBe(7);
    expect(SIDEWALK_SERVICE_ADAPTER.executionEstimateDays).toBe(30);
    expect(SIDEWALK_SERVICE_ADAPTER.privateFrontagePolicy).toBe("manual_review_only");
  });

  it("requires an explicit jurisdiction before forwarding", () => {
    expect(classifySidewalkJurisdiction(null)).toBe("jurisdiction_required");
    expect(classifySidewalkJurisdiction("private_property_frontage")).toBe("jurisdiction_required");
    expect(canPrepareSidewalkForwarding("public_municipal_sidewalk")).toBe(true);
    expect(canPrepareSidewalkForwarding("unknown")).toBe(false);
  });
});
