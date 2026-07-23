import { permanentRedirect } from "next/navigation";
import { comunCanonicalRoutes } from "@/lib/comun-canonical-routes";

export default async function LegacySidewalkRecordPage({
  params,
}: {
  params: Promise<{ recordSlug: string }>;
}) {
  const { recordSlug } = await params;
  permanentRedirect(comunCanonicalRoutes.sidewalkRecord(recordSlug));
}
