import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { isComunBusLocalPilotEnabled } from "./comun-bus-feature";

export function createComunBusClient(env: Record<string, string | undefined> = process.env) {
  if (!isComunBusLocalPilotEnabled(env)) throw new Error("COMUN_BUS_LOCAL_RUNTIME_REQUIRED");
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-comun-scope": "bus-local-48-0e" } },
  });
}

export function hashBusSessionToken(token: string) {
  return createHash("sha256").update(`comun-bus-session-v1:${token}`).digest("hex");
}

export function isValidBusToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{24,160}$/.test(value);
}
