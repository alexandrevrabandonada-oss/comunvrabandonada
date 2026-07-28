import {
  classifySidewalkOperationalFlag,
  diagnoseSidewalkOperationalDependencies,
  diagnoseSidewalkOperationalRelease,
} from "@/lib/sidewalk-operational-release";
import {
  createSidewalkOperationalDiagnosticPayload,
  createSidewalkOperationalDiagnosticResponse,
  isProtectedSidewalkOperationalDiagnosticRequest,
} from "@/lib/sidewalk-operational-diagnostic-route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isProtectedSidewalkOperationalDiagnosticRequest(request)) {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const dependencies = await diagnoseSidewalkOperationalDependencies();
  const operationalState = await diagnoseSidewalkOperationalRelease({
    dependencies,
  });
  const payload = createSidewalkOperationalDiagnosticPayload({
    flag: classifySidewalkOperationalFlag(
      process.env.COMUN_SIDEWALK_OPERATIONAL_V2,
    ),
    dependencies,
    operationalState,
  });

  return createSidewalkOperationalDiagnosticResponse({ request, payload });
}
