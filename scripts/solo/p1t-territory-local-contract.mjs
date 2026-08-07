import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey)
  throw new Error("P1T local contract requires loopback Supabase credentials");
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(url))
  throw new Error("P1T local contract refuses non-loopback Supabase");
if (process.env.COMUN_TERRITORY_PROFILE_ENABLED !== "enabled")
  throw new Error("P1T local contract requires the canonical flag locally");
if (process.env.COMUN_TERRITORY_CATALOG_LOCAL === "enabled")
  throw new Error("P1T local contract must not rely on the local-only alias");

const service = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const email = `p1t-territory-${Date.now().toString(36)}@example.test`;
const password = "P1T-local-only-123!";
let userId;

try {
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  userId = created.data.user.id;

  const profile = {
    user_id: userId,
    display_name: "Pessoa P1T fixture",
    status: "active",
    profile_visibility: "private",
    participation_visibility: "private",
    onboarding_completed_at: new Date().toISOString(),
    territory_municipality: "Volta Redonda",
    territory_neighborhood: "Aterrado",
    territory_source_version: "p1t-local-catalog-v1",
  };
  const inserted = await service
    .from("comun_member_profiles")
    .upsert(profile, { onConflict: "user_id" });
  if (inserted.error) throw inserted.error;

  const read = await service
    .from("comun_member_profiles")
    .select(
      "user_id, profile_visibility, participation_visibility, territory_municipality, territory_neighborhood, territory_source_version",
    )
    .eq("user_id", userId)
    .single();
  if (read.error) throw read.error;
  if (
    read.data.territory_municipality !== "Volta Redonda" ||
    read.data.territory_neighborhood !== "Aterrado" ||
    read.data.territory_source_version !== "p1t-local-catalog-v1" ||
    read.data.profile_visibility !== "private" ||
    read.data.participation_visibility !== "private"
  )
    throw new Error("P1T private territory persistence contract failed");

  const publicRead = await anon
    .from("comun_member_profiles")
    .select("user_id")
    .eq("user_id", userId);
  if (!publicRead.error && publicRead.data?.length)
    throw new Error("P1T territory became publicly readable");

  await mkdir(".ci-artifacts/p1t-territory", { recursive: true });
  await writeFile(
    ".ci-artifacts/p1t-territory/result.json",
    `${JSON.stringify(
      {
        result: "COMUN_P1T_DISPOSABLE_E2E_GREEN",
        capability: "optional_private_profile_territory",
        canonicalFlag: "enabled",
        municipality: "present",
        neighborhood: "present",
        sourceVersion: "present",
        visibility: "private",
        publicRead: "denied_or_empty",
        containsPersonalData: false,
        containsSecrets: false,
        containsCoordinates: false,
      },
      null,
      2,
    )}\n`,
  );
  console.log("COMUN_P1T_DISPOSABLE_E2E_GREEN");
} finally {
  if (userId) {
    const removed = await service.auth.admin.deleteUser(userId);
    if (removed.error) throw removed.error;
  }
}
