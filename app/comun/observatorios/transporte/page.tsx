import { notFound } from "next/navigation";
import { ComunShell } from "@/components/comun-shell";
import { TransportProgrammedNetwork } from "@/components/comun-transport-programmed-network";
import { TransportSystemMetrics } from "@/components/comun-transport-system-metrics";
import { findTransportLines, getTransportOperators } from "@/lib/comun-transport-programmed-network";
import { COMUN_TRANSPORT_SYSTEM_METRICS_SNAPSHOT } from "@/lib/comun-transport-system-metrics";
import { isComunObservatoryTransportProgrammedEnabled, isComunObservatoryTransportSystemMetricsEnabled } from "@/lib/comun-observatory-feature";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { if (!isComunObservatoryTransportProgrammedEnabled()) notFound(); const query = await searchParams; const search = typeof query.busca === "string" ? query.busca.slice(0, 120) : ""; const operator = typeof query.operadora === "string" ? query.operadora.slice(0, 120) : ""; return <ComunShell><TransportProgrammedNetwork lines={findTransportLines(search, operator)} operators={getTransportOperators()} search={search} operator={operator} />{isComunObservatoryTransportSystemMetricsEnabled() ? <div className="mx-auto max-w-6xl px-4 pb-12"><TransportSystemMetrics snapshot={COMUN_TRANSPORT_SYSTEM_METRICS_SNAPSHOT} /></div> : null}</ComunShell>; }
