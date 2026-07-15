import assert from "node:assert/strict";
import { cleanupLocalComunFixtures, createLocalPautaMiniappFixture, localFixturePassword, localPersonaEmails, localPublicConfig } from "../tests/fixtures/comun/local-fixtures.mjs";
import { createClient } from "@supabase/supabase-js";

await cleanupLocalComunFixtures();
try {
  const { db, pautaId, users } = await createLocalPautaMiniappFixture();
  const { data: facilitator } = await db.from("comun_pauta_memberships").select("role,status").eq("pauta_id", pautaId).eq("member_user_id", users.facilitator).single();
  const { data: participant } = await db.from("comun_pauta_memberships").select("role,status").eq("pauta_id", pautaId).eq("member_user_id", users.participant).single();
  const { data: unattached } = await db.from("comun_pauta_memberships").select("id").eq("pauta_id", pautaId).eq("member_user_id", users.unattached).maybeSingle();
  assert.equal(facilitator?.role, "facilitator"); assert.equal(facilitator?.status, "active"); assert.equal(participant?.role, "participant"); assert.equal(unattached, null);
  const { url, anonKey } = localPublicConfig(); assert.ok(anonKey);
  const auth = createClient(url, anonKey, { auth: { persistSession: false } }); const { data, error } = await auth.auth.signInWithPassword({ email: localPersonaEmails.participant, password: localFixturePassword }); assert.ifError(error); assert.equal(data.user?.id, users.participant); await auth.auth.signOut();
  await db.from("comun_member_profiles").update({ status: "suspended", suspension_reason_private: "fixture" }).eq("user_id", users.participant);
  const { data: suspended } = await db.from("comun_member_profiles").select("status,suspension_reason_private").eq("user_id", users.participant).single();
  assert.equal(suspended?.status, "suspended"); assert.equal(suspended?.suspension_reason_private, "fixture");
  console.log("COMUN_COMMUNITY_AUTH_LOCAL_OK");
} finally { await cleanupLocalComunFixtures(); }
