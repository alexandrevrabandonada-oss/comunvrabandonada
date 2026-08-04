import { NextResponse } from "next/server";
import { isComunBusLocalPilotEnabled } from "@/lib/comun-bus-feature";
import { createComunBusClient } from "@/lib/comun-bus-runtime";
import { COMUN_BUS_NO_STORE } from "@/lib/comun-bus-feature";

export function dormant() {
  return NextResponse.json({ code: "not_found" }, { status: 404, headers: COMUN_BUS_NO_STORE });
}

export function getBusClient() {
  if (!isComunBusLocalPilotEnabled()) return null;
  return createComunBusClient();
}

export function invalid(message = "invalid_request") {
  return NextResponse.json({ code: message }, { status: 400, headers: COMUN_BUS_NO_STORE });
}

export function unavailable() {
  return NextResponse.json({ code: "bus_local_unavailable" }, { status: 503, headers: COMUN_BUS_NO_STORE });
}

export function ok(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: COMUN_BUS_NO_STORE });
}
