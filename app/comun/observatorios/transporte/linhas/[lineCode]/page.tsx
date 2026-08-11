import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import { TransportLineDetail } from "@/components/comun-transport-programmed-network";
import { getTransportLine } from "@/lib/comun-transport-programmed-network";
import { isComunObservatoryTransportProgrammedEnabled } from "@/lib/comun-observatory-feature";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ lineCode: string }> }) { if (!isComunObservatoryTransportProgrammedEnabled()) notFound(); const line = getTransportLine((await params).lineCode); if (!line) notFound(); return <ComunShell><TransportLineDetail line={line} /></ComunShell>; }
