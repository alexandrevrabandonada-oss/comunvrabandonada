import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const hashBusSessionToken = (token) => createHash("sha256").update(token).digest("hex");

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const must = (result, label) => { if (result.error) throw new Error(`${label}:${result.error.message}`); return result.data; };

const lines = must(await db.rpc("comun_bus_list_lines"), "lines");
assert.ok(Array.isArray(lines) && lines.length > 0);
const stops = must(await db.rpc("comun_bus_list_stops"), "stops");
assert.ok(Array.isArray(stops) && stops.length > 0);
const timetable = must(await db.rpc("comun_bus_get_timetable", { p_line_id: lines[0].id }), "timetable");
assert.ok(timetable.some((row) => row.sourceState === "active" && row.sourceReference.startsWith("fixture://")));
const row = timetable[0];
const sessionToken = `bus-local-${randomUUID().replaceAll("-", "")}`;
const started = must(await db.rpc("comun_bus_start_waiting", { p_token_hash: hashBusSessionToken(sessionToken), p_line_id: row.lineId, p_direction_id: row.directionId, p_stop_id: row.stopId, p_timetable_version_id: row.versionId, p_service_date: "2026-08-04", p_scheduled_time: row.departureTime }), "start");
const repeated = must(await db.rpc("comun_bus_start_waiting", { p_token_hash: hashBusSessionToken(sessionToken), p_line_id: row.lineId, p_direction_id: row.directionId, p_stop_id: row.stopId, p_timetable_version_id: row.versionId, p_service_date: "2026-08-04", p_scheduled_time: row.departureTime }), "idempotency");
assert.equal(started.id, repeated.id);
const arrived = must(await db.rpc("comun_bus_record_event", { p_token_hash: hashBusSessionToken(sessionToken), p_session_id: started.id, p_event_type: "bus_arrived", p_observed_at: "2026-08-04T13:04:00Z", p_payload: { crowding: "not_observed" } }), "arrival");
assert.equal(arrived.state, "bus_arrived");
const publicAttempt = await anon.rpc("comun_bus_list_lines");
assert.ok(publicAttempt.error, "anon must not execute the bus RPC");
const client = new pg.Client({ connectionString: process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL });
await client.connect();
const rls = await client.query(`select c.relname, c.relrowsecurity, c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname like 'comun_bus_%' and c.relkind='r' order by c.relname`);
assert.equal(rls.rows.length, 20);
assert.ok(rls.rows.every((row) => row.relrowsecurity && row.relforcerowsecurity));
const grants = await client.query(`select routine_name, grantee from information_schema.routine_privileges where routine_schema='public' and routine_name like 'comun_bus_%' and grantee in ('anon','authenticated','public')`);
assert.equal(grants.rows.length, 0);
await client.end();
console.log(JSON.stringify({ result: "COMUN_BUS_48_0E_DB_GREEN", lines: lines.length, stops: stops.length, timetable: timetable.length, idempotent: true, sessionState: arrived.state, rlsTables: rls.rows.length, publicRpcExecute: false }));
