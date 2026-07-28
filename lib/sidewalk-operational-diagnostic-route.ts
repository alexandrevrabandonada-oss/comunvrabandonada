import type {
  SidewalkOperationalDependencies,
  SidewalkOperationalReleaseState,
} from "@/lib/sidewalk-operational-release";

export const protectedSidewalkOperationalDiagnosticHost =
  /^comunvrabandonada-[a-z0-9-]+-alexandrevrabandonada-oss-projects\.vercel\.app$/;

export type SidewalkOperationalDiagnosticPayload = {
  formatVersion: 1;
  flag: "disabled" | "enabled" | "missing";
  databaseUrl: "present" | "missing";
  database: "reachable" | "unreachable" | "not_tested";
  ledger: "exact" | "missing" | "mismatch" | "not_tested";
  operationalState: SidewalkOperationalReleaseState;
};

export function isProtectedSidewalkOperationalDiagnosticRequest(
  request: Request,
) {
  try {
    return protectedSidewalkOperationalDiagnosticHost.test(
      new URL(request.url).hostname,
    );
  } catch {
    return false;
  }
}

export function createSidewalkOperationalDiagnosticPayload({
  flag,
  dependencies,
  operationalState,
}: {
  flag: "disabled" | "enabled" | "missing";
  dependencies: SidewalkOperationalDependencies;
  operationalState: SidewalkOperationalReleaseState;
}): SidewalkOperationalDiagnosticPayload {
  const database = !dependencies.databaseUrlPresent
    ? "not_tested"
    : dependencies.databaseReachable
      ? "reachable"
      : "unreachable";
  const ledger = !dependencies.databaseReachable
    ? "not_tested"
    : dependencies.ledgerExact
      ? "exact"
      : dependencies.ledgerRowPresent
        ? "mismatch"
        : "missing";

  return {
    formatVersion: 1,
    flag,
    databaseUrl: dependencies.databaseUrlPresent ? "present" : "missing",
    database,
    ledger,
    operationalState,
  };
}

export function createSidewalkOperationalDiagnosticResponse({
  request,
  payload,
}: {
  request: Request;
  payload: SidewalkOperationalDiagnosticPayload;
}) {
  if (!isProtectedSidewalkOperationalDiagnosticRequest(request)) {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return Response.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
