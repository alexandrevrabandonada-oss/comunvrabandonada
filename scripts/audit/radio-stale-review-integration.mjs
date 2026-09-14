import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { root, state, assertOwned, localStatus, command } from "./radio-lab.mjs";

const owned = assertOwned(state());
const env = localStatus(owned);
const run = crypto.randomUUID();
const report = path.join(root, "tmp/radio-stale-review-results.json");
const db = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const items = [];
const results = [];
const authUsers = [];

async function query(text, values = []) {
  assertOwned(owned);
  const client = new pg.Client({ connectionString: env.DB_URL });
  await client.connect();
  try { return await client.query(text, values); } finally { await client.end(); }
}
async function serviceQuery(text, values = []) {
  assertOwned(owned);
  const client = new pg.Client({ connectionString: env.DB_URL });
  await client.connect();
  try {
    await client.query("set role service_role");
    return await client.query(text, values);
  } finally { await client.end(); }
}
async function record(name, fn) {
  try { results.push({ name, status: "PASS", evidence: await fn() }); }
  catch (error) { results.push({ name, status: "FAIL", detail: String(error.message).slice(0, 400) }); }
  fs.writeFileSync(report, JSON.stringify({ sha: command("git", ["rev-parse", "HEAD"]).trim(), run, results }, null, 2));
}
async function fixture() {
  const program = crypto.randomUUID(), episode = crypto.randomUUID();
  items.push(program, episode);
  const client = new pg.Client({ connectionString: env.DB_URL });
  await client.connect();
  try {
    await client.query("begin");
    await client.query("insert into public.comun_archive_items(id,slug,item_type,title,status,visibility) values($1,$2,'community_radio_program','Synthetic program','draft','private'),($3,$4,'community_radio_episode','Synthetic episode','draft','private')", [program, `audit-program-${program}`, episode, `audit-episode-${episode}`]);
    await client.query("insert into public.comun_radio_programs(archive_item_id,title_public,slug_public,description_public,format_type) values($1,'Synthetic program',$2,'Disposable','mixed')", [program, `audit-program-${program}`]);
    await client.query("insert into public.comun_radio_episodes(archive_item_id,program_item_id,title_public,slug_public,summary_public,description_public,duration_seconds,publication_status,transcript_status) values($1,$2,'Synthetic episode',$3,'Reviewed summary','Disposable context',60,'editorial_review','published')", [episode, program, `audit-episode-${episode}`]);
    await client.query("insert into public.comun_archive_assets(archive_item_id,asset_role,bucket_scope,object_key,original_filename,mime_type,size_bytes,review_status,public_url) values($1,'radio_public_episode','public_safe',$2,'episode.mp3','audio/mpeg',100,'approved',$3)", [episode, `radio-public/${episode}/episode.mp3`, `http://127.0.0.1:${owned.apiPort}/storage/v1/object/public/radio-public-audio/radio-public/${episode}/episode.mp3`]);
    await client.query("insert into public.comun_radio_credits(episode_item_id,credit_role,public_credit,public_visibility) values($1,'producer','Synthetic credit','public')", [episode]);
    await client.query("insert into public.comun_radio_voice_consents(episode_item_id,participant_reference_private,consent_status,allow_private_preservation,allow_comun_audio,allow_transcript) values($1,$2,'approved',true,true,true)", [episode, `private-${run}`]);
    await client.query("insert into public.comun_radio_music_uses(episode_item_id,title_public,usage_type,rights_status,allow_streaming) values($1,'Synthetic music','original_commission','approved',true)", [episode]);
    await client.query("insert into public.comun_radio_safety_reviews(episode_item_id,minor_involved_private,guardian_authorization_confirmed,reinforced_review_status) values($1,true,true,'approved')", [episode]);
    await client.query("insert into public.comun_radio_transcript_versions(episode_item_id,version_number,transcript_type,content,status) values($1,1,'manual_editorial','Synthetic transcript','published')", [episode]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { await client.end(); }
  return episode;
}
async function prepare(episode) {
  const r = await serviceQuery("select public.comun_prepare_radio_publication_review($1,$2) value", [episode, admin]);
  assert.equal(r.rows[0].value.outcome, "ready");
  assert.match(r.rows[0].value.identity, /^[a-f0-9]{64}$/);
  return r.rows[0].value.identity;
}
async function waitForLock(observer, pid) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const r = await observer.query("select wait_event_type from pg_stat_activity where pid=$1", [pid]);
    if (r.rows[0]?.wait_event_type === "Lock") return;
    await new Promise(setImmediate);
  }
  throw new Error(`publisher ${pid} did not reach deterministic lock barrier`);
}
async function staleCase(name, mutation, expectedBlocker) {
  await record(name, async () => {
    const episode = await fixture(), identity = await prepare(episode);
    const mutator = new pg.Client({ connectionString: env.DB_URL });
    const publisher = new pg.Client({ connectionString: env.DB_URL });
    const observer = new pg.Client({ connectionString: env.DB_URL });
    await Promise.all([mutator.connect(), publisher.connect(), observer.connect()]);
    try {
      await mutator.query("begin");
      await mutator.query(mutation, [episode]);
      await publisher.query("set role service_role");
      const pending = publisher.query("select public.comun_commit_radio_publication($1,$2,$3) value", [episode, identity, admin]);
      await waitForLock(observer, publisher.processID);
      await mutator.query("commit");
      const value = (await pending).rows[0].value;
      assert.equal(value.outcome, "conflict");
      if (expectedBlocker) assert.ok(value.blockers.includes(expectedBlocker));
      const status = await observer.query("select publication_status from public.comun_radio_episodes where archive_item_id=$1", [episode]);
      assert.equal(status.rows[0].publication_status, "editorial_review");
      const audit = await observer.query("select metadata from public.comun_admin_audit_log where target_id=$1 and action='radio_episode_publish_stale'", [episode]);
      assert.equal(audit.rowCount, 1);
      assert.equal(audit.rows[0].metadata.expected_identity, identity);
      assert.notEqual(audit.rows[0].metadata.current_identity, identity);
      return { outcome: value.outcome, blocker: expectedBlocker ?? "identity_changed", lockObserved: true, audited: true };
    } finally { await Promise.allSettled([mutator.query("rollback"), mutator.end(), publisher.end(), observer.end()]); }
  });
}

const created = await db.auth.admin.createUser({ email: `radio-stale-${run}@example.invalid`, password: crypto.randomBytes(24).toString("hex"), email_confirm: true });
assert.equal(created.error, null);
const authUser = created.data.user.id;
authUsers.push(authUser);
const adminResult = await query("insert into public.comun_admin_users(user_id,email,role,is_active) values($1,$2,'editor',true) returning id", [authUser, `radio-stale-${run}@example.invalid`]);
const admin = adminResult.rows[0].id;

try {
  await staleCase("consent approved -> withdrawn", "update public.comun_radio_voice_consents set consent_status='withdrawn' where episode_item_id=$1", "voice_consent");
  await staleCase("allow_comun_audio true -> false", "update public.comun_radio_voice_consents set allow_comun_audio=false where episode_item_id=$1", "voice_consent");
  await staleCase("rights approved -> withdrawn", "update public.comun_radio_music_uses set rights_status='withdrawn' where episode_item_id=$1", "music_rights");
  await staleCase("allow_streaming true -> false", "update public.comun_radio_music_uses set allow_streaming=false where episode_item_id=$1", "music_rights");
  await staleCase("minor safety approved -> rejected", "update public.comun_radio_safety_reviews set reinforced_review_status='rejected' where episode_item_id=$1", "minor_safety");
  await staleCase("transcript published -> withdrawn", "update public.comun_radio_transcript_versions set status='withdrawn' where episode_item_id=$1", "transcript");
  await staleCase("public asset approved -> pending", "update public.comun_archive_assets set review_status='pending' where archive_item_id=$1 and asset_role='radio_public_episode'", "public_audio");
  await staleCase("insert pending music use", "insert into public.comun_radio_music_uses(episode_item_id,title_public,usage_type,rights_status,allow_streaming) values($1,'Late music','excerpt','pending',false)", "music_rights");
  await staleCase("insert blocking consent", "insert into public.comun_radio_voice_consents(episode_item_id,participant_reference_private,consent_status,allow_comun_audio) values($1,'late','pending',false)", "voice_consent");
  await staleCase("remove required credit", "delete from public.comun_radio_credits where episode_item_id=$1", "credits");
  await staleCase("change reviewed episode checklist field", "update public.comun_radio_episodes set summary_public='Changed after review' where archive_item_id=$1", null);

  await record("idempotent replay and two simultaneous publishers", async () => {
    const episode = await fixture(), identity = await prepare(episode);
    const barrier = new pg.Client({ connectionString: env.DB_URL });
    const first = new pg.Client({ connectionString: env.DB_URL });
    const second = new pg.Client({ connectionString: env.DB_URL });
    const observer = new pg.Client({ connectionString: env.DB_URL });
    await Promise.all([barrier.connect(), first.connect(), second.connect(), observer.connect()]);
    try {
      await barrier.query("begin; lock table public.comun_radio_episodes in access exclusive mode");
      await Promise.all([first.query("set role service_role"), second.query("set role service_role")]);
      const p1 = first.query("select public.comun_commit_radio_publication($1,$2,$3) value", [episode, identity, admin]);
      const p2 = second.query("select public.comun_commit_radio_publication($1,$2,$3) value", [episode, identity, admin]);
      await Promise.all([waitForLock(observer, first.processID), waitForLock(observer, second.processID)]);
      await barrier.query("commit");
      const outcomes = [(await p1).rows[0].value.outcome, (await p2).rows[0].value.outcome].sort();
      assert.deepEqual(outcomes, ["already_published", "published"]);
      const versions = await observer.query("select count(*)::int n from public.comun_radio_editorial_versions where episode_item_id=$1", [episode]);
      assert.equal(versions.rows[0].n, 1);
      await observer.query("set role service_role");
      const replay = await observer.query("select public.comun_commit_radio_publication($1,$2,$3) value", [episode, identity, admin]);
      assert.equal(replay.rows[0].value.outcome, "already_published");
      return { outcomes, logicalEffects: 1, replay: "already_published", lockObserved: true };
    } finally { await Promise.allSettled([barrier.query("rollback"), barrier.end(), first.end(), second.end(), observer.end()]); }
  });

  await record("withdrawal blocks stale republication", async () => {
    const episode = await fixture(), identity = await prepare(episode);
    await query("update public.comun_radio_episodes set publication_status='withdrawn' where archive_item_id=$1", [episode]);
    const r = await serviceQuery("select public.comun_commit_radio_publication($1,$2,$3) value", [episode, identity, admin]);
    assert.equal(r.rows[0].value.outcome, "blocked");
    return { outcome: "blocked", state: "withdrawn" };
  });

  await record("anon/authenticated/viewer and forged identity stay negative", async () => {
    for (const role of ["anon", "authenticated"]) {
      const privilege = await query("select has_function_privilege($1,'public.comun_commit_radio_publication(uuid,text,uuid)','execute') allowed", [role]);
      assert.equal(privilege.rows[0].allowed, false);
    }
    const viewerEmail = `viewer-${run}@example.invalid`;
    const viewerAuth = await db.auth.admin.createUser({ email: viewerEmail, password: crypto.randomBytes(24).toString("hex"), email_confirm: true });
    assert.equal(viewerAuth.error, null);
    authUsers.push(viewerAuth.data.user.id);
    const viewer = await query("insert into public.comun_admin_users(user_id,email,role,is_active) values($1,$2,'viewer',true) returning id", [viewerAuth.data.user.id, viewerEmail]);
    const episode = await fixture(), identity = await prepare(episode);
    const denied = await serviceQuery("select public.comun_commit_radio_publication($1,$2,$3) value", [episode, identity, viewer.rows[0].id]);
    assert.equal(denied.rows[0].value.outcome, "denied");
    await query("delete from public.comun_admin_users where id=$1", [viewer.rows[0].id]);
    return { anonExecute: false, authenticatedExecute: false, viewer: "denied", forgedAdmin: "denied" };
  });

  await record("client cannot delete audit evidence", async () => {
    for (const role of ["anon", "authenticated"]) {
      const client = new pg.Client({ connectionString: env.DB_URL });
      await client.connect();
      try {
        await client.query("begin");
        await client.query(`set local role ${role}`);
        try {
          const deleted = await client.query("delete from public.comun_admin_audit_log where admin_user_id=$1 returning id", [admin]);
          assert.equal(deleted.rowCount, 0);
        } catch (error) {
          assert.equal(error.code, "42501");
        }
        await client.query("rollback");
      } finally { await client.end(); }
    }
    return { anonDeletedRows: 0, authenticatedDeletedRows: 0 };
  });
} finally {
  assertOwned(owned);
  for (const id of items.reverse()) await query("delete from public.comun_archive_items where id=$1", [id]);
  await query("delete from public.comun_admin_audit_log where admin_user_id=$1", [admin]);
  await query("delete from public.comun_admin_users where id=$1", [admin]);
  for (const id of authUsers) assert.equal((await db.auth.admin.deleteUser(id)).error, null);
  fs.writeFileSync(report, JSON.stringify({ sha: command("git", ["rev-parse", "HEAD"]).trim(), run, results }, null, 2));
}

console.log(JSON.stringify(results.map(({ name, status }) => ({ name, status }))));
if (results.some((x) => x.status !== "PASS")) process.exitCode = 1;
