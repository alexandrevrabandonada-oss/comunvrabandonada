export type ComunProtocolResolution = {
  input: string;
  canonical: string;
  origin: "legacy" | "relata" | "future";
  version: "legacy-v1" | "relata-v1" | "future-v1";
  valid: boolean;
};

export function resolveComunProtocol(value: string): ComunProtocolResolution {
  const input = value.trim().toUpperCase();
  if (/^COMUN-RELATA-[A-F0-9]{16}$/.test(input)) {
    return { input, canonical: input, origin: "relata", version: "relata-v1", valid: true };
  }
  if (/^COMUN-\d{8}-\d{6}$/.test(input) || /^COMUN-(?:DEMO|HUB|CALC|REHEARSAL)-[A-Z0-9-]+$/.test(input)) {
    return { input, canonical: input, origin: "legacy", version: "legacy-v1", valid: true };
  }
  return { input, canonical: input, origin: "future", version: "future-v1", valid: false };
}

export function isCanonicalComunProtocol(value: string) {
  return resolveComunProtocol(value).valid;
}
