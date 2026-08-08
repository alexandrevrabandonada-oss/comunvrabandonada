import { headers } from "next/headers";
import {
  createP3bRuntimeEnvDiagnostic,
  isP3bStagedProductionHost,
} from "@/lib/comun-p3b-runtime-env-diagnostic";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";

  if (!isP3bStagedProductionHost(host, process.env)) {
    return new Response(null, {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }

  return Response.json(
    createP3bRuntimeEnvDiagnostic(process.env),
    {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    },
  );
}
