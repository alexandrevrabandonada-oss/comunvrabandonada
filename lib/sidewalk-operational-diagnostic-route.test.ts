import { describe, expect, it } from "vitest";
import {
  createSidewalkOperationalDiagnosticPayload,
  createSidewalkOperationalDiagnosticResponse,
  isProtectedSidewalkOperationalDiagnosticRequest,
} from "./sidewalk-operational-diagnostic-route";

const dependencies = {
  databaseUrlPresent: true,
  databaseReachable: true,
  ledgerRowPresent: true,
  ledgerExact: true,
  status: "OPERATIONAL_READY" as const,
};

const immutableRequest = new Request(
  "https://comunvrabandonada-readiness-alexandrevrabandonada-oss-projects.vercel.app/api/comun/sidewalk-operational-diagnostic",
);

describe("sidewalk operational diagnostic endpoint boundary", () => {
  it("allows only an immutable COMUN Vercel deployment hostname", () => {
    expect(
      isProtectedSidewalkOperationalDiagnosticRequest(immutableRequest),
    ).toBe(true);
    for (const hostname of [
      "comunvrabandonada.vercel.app",
      "comunsocial.online",
      "www.comunsocial.online",
      "comunvrabandonada-readiness-attacker-projects.vercel.app",
    ]) {
      expect(
        isProtectedSidewalkOperationalDiagnosticRequest(
          new Request(
            `https://${hostname}/api/comun/sidewalk-operational-diagnostic`,
          ),
        ),
      ).toBe(false);
    }
  });

  it("returns a no-store, exact sanitized diagnostic only to the immutable deployment", async () => {
    const payload = createSidewalkOperationalDiagnosticPayload({
      flag: "enabled",
      dependencies,
      operationalState: "OPERATIONAL_READY",
    });
    const response = createSidewalkOperationalDiagnosticResponse({
      request: immutableRequest,
      payload,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      formatVersion: 1,
      flag: "enabled",
      databaseUrl: "present",
      database: "reachable",
      ledger: "exact",
      operationalState: "OPERATIONAL_READY",
    });
  });

  it("returns 404 to the public alias without exposing a diagnostic payload", async () => {
    const response = createSidewalkOperationalDiagnosticResponse({
      request: new Request(
        "https://comunvrabandonada.vercel.app/api/comun/sidewalk-operational-diagnostic",
      ),
      payload: createSidewalkOperationalDiagnosticPayload({
        flag: "disabled",
        dependencies,
        operationalState: "FLAG_DISABLED",
      }),
    });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });

  it("maps missing and unreachable dependencies without returning values or database errors", () => {
    const payload = createSidewalkOperationalDiagnosticPayload({
      flag: "missing",
      dependencies: {
        databaseUrlPresent: false,
        databaseReachable: false,
        ledgerRowPresent: false,
        ledgerExact: false,
        status: "DATABASE_URL_MISSING",
      },
      operationalState: "FLAG_DISABLED",
    });
    expect(payload).toEqual({
      formatVersion: 1,
      flag: "missing",
      databaseUrl: "missing",
      database: "not_tested",
      ledger: "not_tested",
      operationalState: "FLAG_DISABLED",
    });
    expect(JSON.stringify(payload)).not.toMatch(
      /postgres|password|connection|error/i,
    );
  });
});
