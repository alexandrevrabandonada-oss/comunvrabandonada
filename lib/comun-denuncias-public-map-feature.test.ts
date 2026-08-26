import { describe, expect, it } from "vitest";
import {
  COMUN_DENUNCIAS_PUBLIC_MAP_FLAG,
  isComunDenunciasPublicMapEnabled,
  shouldCloakComunDenunciasPublicMap,
} from "./comun-denuncias-public-map-feature";

const keys = (byte: number) => Buffer.alloc(32, byte).toString("base64url");
const ready = {
  COMUN_RELATA_PERSISTENCE_ENABLED: "enabled",
  COMUN_RELATA_ATTACHMENTS_ENABLED: "enabled",
  COMUN_RELATA_LOCATION_ENABLED: "enabled",
  COMUN_RELATA_COLLECTIVE_ENABLED: "enabled",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "server-only",
  COMUN_RELATA_LOCATION_ENCRYPTION_KEY: keys(1),
  COMUN_RELATA_SPATIAL_HMAC_KEY: keys(2),
  [COMUN_DENUNCIAS_PUBLIC_MAP_FLAG]: "enabled",
};

describe("48.6-B0 Production map boundary", () => {
  it("is disabled unless the new Production boundary and all dependencies are enabled", () => {
    expect(isComunDenunciasPublicMapEnabled({ ...ready, [COMUN_DENUNCIAS_PUBLIC_MAP_FLAG]: "disabled" })).toBe(false);
    expect(isComunDenunciasPublicMapEnabled(ready)).toBe(true);
  });
  it("cloaks canonical route and API while the map flag is off", () => {
    const dormant = { ...ready, [COMUN_DENUNCIAS_PUBLIC_MAP_FLAG]: "disabled" };
    expect(shouldCloakComunDenunciasPublicMap("/comun/denuncias/mapa", dormant)).toBe(true);
    expect(shouldCloakComunDenunciasPublicMap("/api/comun/denuncias/mapa/cases", dormant)).toBe(true);
    expect(shouldCloakComunDenunciasPublicMap("/comun/relata/mapa", dormant)).toBe(false);
  });
});
