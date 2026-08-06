import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`missing local env: ${name}`);
}

if (process.env.ALLOW_LOCAL_TESTS !== "true")
  throw new Error("territory local-only lane requires ALLOW_LOCAL_TESTS=true");
if (process.env.COMUN_TERRITORY_CATALOG_LOCAL !== "enabled")
  throw new Error("territory local-only alias is not enabled");
if (process.env.COMUN_TERRITORY_PROFILE_ENABLED === "enabled")
  throw new Error(
    "territory local-only lane must not promote the Production flag",
  );
if (
  !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  )
)
  throw new Error("territory local-only lane requires loopback Supabase");

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const email = `territory-local-only-${Date.now().toString(36)}@example.test`;
const password = "Territory-local-only-123!";
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
    display_name: "Pessoa território fixture",
    status: "active",
    profile_visibility: "private",
    participation_visibility: "private",
    onboarding_completed_at: new Date().toISOString(),
    territory_municipality: "Volta Redonda",
    territory_neighborhood: "Aterrado",
    territory_source_version: "2026-08-04-textual-preliminary",
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
    read.data.profile_visibility !== "private" ||
    read.data.participation_visibility !== "private"
  ) {
    throw new Error("territory local-only persistence/privacy contract failed");
  }

  await mkdir(".ci-artifacts/territory-local-only", { recursive: true });
  await writeFile(
    ".ci-artifacts/territory-local-only/result.json",
    `${JSON.stringify(
      {
        result: "COMUN_TERRITORY_PROFILE_LOCAL_ONLY_GREEN",
        capability: "local_alias_only",
        municipality: "present",
        neighborhood: "present",
        visibility: "private",
        containsPersonalData: false,
        containsSecrets: false,
        containsCoordinates: false,
      },
      null,
      2,
    )}\n`,
  );
  console.log("COMUN_TERRITORY_PROFILE_LOCAL_ONLY_GREEN");
} finally {
  if (userId) {
    const removed = await service.auth.admin.deleteUser(userId);
    if (removed.error) throw removed.error;
  }
}
