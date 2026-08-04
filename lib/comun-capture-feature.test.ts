import { describe, expect, it } from "vitest";
import { isComunQuickCaptureEnabled, shouldCloakComunQuickCaptureApi } from "./comun-capture-feature";

const base = {
  COMUN_RELATA_PREVIEW: "enabled",
  COMUN_RELATA_LOCAL_PERSISTENCE: "enabled",
  COMUN_RELATA_LOCAL_EVIDENCE: "enabled",
  COMUN_QUICK_CAPTURE_V2: "enabled",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:56431",
  SUPABASE_SERVICE_ROLE_KEY: "local",
  COMUN_RELATA_LOCATION_ENCRYPTION_KEY: "local",
  COMUN_RELATA_SPATIAL_HMAC_KEY: "spatial",
};

describe("quick capture local barrier", () => {
  it("requires all local flags and a loopback target", () => {
    expect(isComunQuickCaptureEnabled(base)).toBe(true);
    expect(isComunQuickCaptureEnabled({ ...base, COMUN_QUICK_CAPTURE_V2: "disabled" })).toBe(false);
    expect(isComunQuickCaptureEnabled({ ...base, NEXT_PUBLIC_SUPABASE_URL: "https://remote.example" })).toBe(false);
  });

  it("cloaks telemetry while dormant", () => {
    expect(shouldCloakComunQuickCaptureApi("/api/comun/capture/telemetry", { ...base, COMUN_QUICK_CAPTURE_V2: "disabled" })).toBe(true);
    expect(shouldCloakComunQuickCaptureApi("/api/comun/capture/telemetry", base)).toBe(false);
  });
});
