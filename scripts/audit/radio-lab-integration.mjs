import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import pg from 'pg';
import { root, state, assertOwned, localStatus, cleanEnv, command, sql } from './radio-lab.mjs';

const s = assertOwned(state());
const env = localStatus(s);
const results = [];
const run = crypto.randomUUID();
const base = 'http://127.0.0.1:3118';
const ids = [], users = [], objectKeys = [];
const report = path.join(root, 'tmp/radio-integration-results.json');
const guardedFetch = async (input, options) => {
  const url = new URL(typeof input === 'string' ? input : input.url ?? input.toString());
  assert.equal(url.protocol, 'http:');
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  assert.equal(url.port, '56431');
  assertOwned(s);
  return fetch(input, { ...options, redirect: 'error' });
};
const client = key => createClient(env.API_URL, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: guardedFetch } });
const db = client(env.SERVICE_ROLE_KEY);
const anon = client(env.ANON_KEY);
async function checked(query) { const r = await query; if (r.error) throw new Error(`Local database error ${r.error.code ?? 'unknown'}`); return r.data; }
async function test(name, fn) {
  try { const evidence = await fn(); results.push({ name, status: 'PASS', evidence }); }
  catch (e) {
    if (lock) { await lock.query('rollback').catch(() => {}); await lock.end().catch(() => {}); lock = null; }
    results.push({ name, status: 'FAIL', reason: e.code ?? e.name, detail: String(e.message).replace(/https?:\/\/\S+/g, '[url]').slice(0, 350) });
  }
  fs.writeFileSync(report, JSON.stringify({ sha: command('git', ['rev-parse', 'HEAD']).trim(), run, results }, null, 2));
}
// Each request owns a fresh TCP connection. No shared fetch pool or mocked route.
function request(route, cookie = '', body = {}, headers = {}, dropAfterHeaders = false) {
  assertOwned(s);
  return new Promise((resolve, reject) => {
    const bytes = JSON.stringify(body);
    const r = http.request(base + route, { method: 'POST', agent: false, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bytes), Cookie: cookie, ...headers } }, response => {
      if (dropAfterHeaders) { response.destroy(); resolve({ responseLost: true }); return; }
      const chunks = [];
      response.on('data', c => chunks.push(c));
      response.on('end', () => { const text = Buffer.concat(chunks).toString(); let json; try { json = JSON.parse(text); } catch { json = {}; } resolve({ status: response.statusCode, json, text }); });
    });
    r.setTimeout(60000, () => r.destroy(new Error('Local HTTP timeout')));
    r.on('error', reject); r.end(bytes);
  });
}
async function actor(role) {
  const email = `audit-${role}-${run}@example.invalid`, password = crypto.randomBytes(24).toString('hex');
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(error, null); users.push(data.user.id);
  if (role === 'editor' || role === 'viewer') await checked(db.from('comun_admin_users').insert({ user_id: data.user.id, email, role, is_active: true }));
  const cookies = new Map();
  const auth = createServerClient(env.API_URL, env.ANON_KEY, { global: { fetch: guardedFetch }, cookies: { getAll: () => [...cookies].map(([name, value]) => ({ name, value })), setAll: all => all.forEach(c => cookies.set(c.name, c.value)) } });
  assert.equal((await auth.auth.signInWithPassword({ email, password })).error, null);
  return { id: data.user.id, auth, cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') };
}
let app;
const appLog = fs.openSync(path.join(s.dir, 'app.private.log'), 'w', 0o600);
let lock;
try {
  app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3118'], { cwd: root, env: { ...cleanEnv(), NEXT_PUBLIC_SUPABASE_URL: env.API_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: env.ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: env.SERVICE_ROLE_KEY, MEDIA_STORAGE_PROVIDER: 'supabase-local', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', appLog, appLog] });
  const deadline = Date.now() + 120000;
  while (true) {
    try { const r = await fetch(base + '/comun/admin/login'); if (r.status === 200) break; } catch { /* startup */ }
    if (Date.now() > deadline || app.exitCode !== null) throw new Error('Local application failed readiness');
    await new Promise(resolve => setTimeout(resolve, 200)); // readiness only; not a concurrency barrier
  }
  const A = await actor('editor'), B = await actor('ordinary'), V = await actor('viewer');
  const program = crypto.randomUUID(); ids.push(program);
  await checked(db.from('comun_archive_items').insert({ id: program, slug: `audit-program-${run}`, title: 'Synthetic program', item_type: 'community_radio_program', visibility: 'private', status: 'draft' }));
  await checked(db.from('comun_radio_programs').insert({ archive_item_id: program, title_public: 'Synthetic program', slug_public: `audit-program-${run}`, description_public: 'Disposable laboratory', format_type: 'mixed' }));
  const episode = crypto.randomUUID(); ids.push(episode);
  await checked(db.from('comun_archive_items').insert({ id: episode, slug: `audit-${run}`, title: 'Synthetic radio audit', item_type: 'community_radio_episode', visibility: 'private', status: 'draft' }));
  await checked(db.from('comun_radio_episodes').insert({ archive_item_id: episode, program_item_id: program, title_public: 'Synthetic radio audit', slug_public: `audit-${run}`, summary_public: 'Synthetic only', description_public: 'Disposable laboratory', transcript_status: 'unavailable' }));
  await checked(db.from('comun_radio_voice_consents').insert({ episode_item_id: episode, participant_reference_private: `private-${run}`, consent_status: 'approved', allow_comun_audio: true }));

  const grants = JSON.parse(sql("select json_agg(json_build_object('role',r,'asset_select',has_table_privilege(r,'public.comun_archive_assets','select'),'radio_select',has_table_privilege(r,'public.comun_radio_episodes','select'))) from unnest(array['anon','authenticated','service_role']) r;"));
  results.push({ name: 'grant matrix (catalog, separate from RLS)', status: 'PASS', evidence: grants });
  const policies = sql("select json_agg(json_build_object('table',tablename,'policy',policyname,'roles',roles,'command',cmd)) from pg_policies where schemaname in ('public','storage') and tablename in ('comun_archive_assets','comun_radio_episodes','objects');");
  results.push({ name: 'RLS policy catalog', status: 'PASS', evidence: JSON.parse(policies) });
  await test('B/anonymous cannot read nonempty private radio base table', async () => {
    for (const c of [B.auth, anon]) {
      const r = await c.from('comun_radio_episodes').select('archive_item_id').eq('archive_item_id', episode);
      assert.ok(r.error || r.data.length === 0);
    }
    return 'Denial only; inspect grants above. Missing GRANT is not RLS proof.';
  });
  await test('unauthorized and viewer requests cannot forge editor identity', async () => {
    for (const cookie of ['', B.cookie, V.cookie]) {
      const r = await request('/api/comun/admin/archive/confirm-upload', cookie, { assetId: episode, userId: A.id, role: 'admin' });
      assert.equal(r.status, 401);
    }
  });
  const wav = Buffer.from(command('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:a', 'pcm_s16le', '-f', 'wav', 'pipe:1'], { encoding: 'buffer' }));
  const prepared = await request('/api/comun/admin/archive/upload-url', A.cookie, { archiveItemId: episode, filename: 'synthetic.wav', role: 'radio_private_original', mimeType: 'audio/wav', sizeBytes: wav.length });
  assert.equal(prepared.status, 200, 'Application upload URL setup');
  const assetId = prepared.json.assetId;
  assert.match(assetId, /^[a-f0-9-]{36}$/);
  const row = (await checked(db.from('comun_archive_assets').select('*').eq('id', assetId).single()));
  objectKeys.push(['radio-private-originals', row.object_key]);
  const upload = await guardedFetch(prepared.json.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'audio/wav' }, body: wav });
  assert.ok(upload.ok, 'Signed upload to owned Storage');
  await test('application upload persisted canonical private metadata and real bytes', async () => {
    assert.equal(row.bucket_scope, 'private_original'); assert.equal(row.public_url, null);
    const info = await db.storage.from('radio-private-originals').info(row.object_key);
    assert.equal(info.error, null); assert.equal(info.data.size, wav.length); assert.equal(info.data.contentType, 'audio/wav');
  });
  await test('B and anonymous cannot download or sign original; authorized signature works', async () => {
    for (const c of [B.auth, anon]) {
      assert.ok((await c.storage.from('radio-private-originals').download(row.object_key)).error);
      assert.ok((await c.storage.from('radio-private-originals').createSignedUrl(row.object_key, 30)).error);
    }
    const signed = await db.storage.from('radio-private-originals').createSignedUrl(row.object_key, 30);
    assert.equal(signed.error, null); assert.ok((await guardedFetch(signed.data.signedUrl)).ok);
    return 'Signing with service-role proves Storage capability, not application signature authorization.';
  });
  await test('B cannot confirm A original via swapped asset ID', async () => {
    assert.equal((await request('/api/comun/admin/archive/confirm-upload', B.cookie, { assetId })).status, 401);
  });
  await test('real confirmation and replay after discarded response', async () => {
    const lost = await request('/api/comun/admin/archive/confirm-upload', A.cookie, { assetId }, {}, true);
    assert.equal(lost.responseLost, true); // TCP response body discarded after server sent its headers
    assert.equal((await request('/api/comun/admin/archive/confirm-upload', A.cookie, { assetId })).status, 200);
    assert.equal((await checked(db.from('comun_archive_assets').select('id').eq('id', assetId))).length, 1);
  });
  await test('simultaneous confirmations: independent HTTP + deterministic database row barrier', async () => {
    // Ownership was established before obtaining this local connection.
    lock = new pg.Client({ connectionString: env.DB_URL }); await lock.connect();
    await lock.query('begin'); await lock.query('select id from comun_archive_assets where id=$1 for update', [assetId]);
    const first = request('/api/comun/admin/archive/confirm-upload', A.cookie, { assetId });
    const second = request('/api/comun/admin/archive/confirm-upload', A.cookie, { assetId });
    const limit = Date.now() + 30000;
    while (true) {
      const q = await lock.query("select count(*)::int n from pg_stat_activity where wait_event_type='Lock' and query ilike '%comun_archive_assets%' and pid<>pg_backend_pid()");
      if (q.rows[0].n >= 2) break;
      if (Date.now() > limit) throw new Error('Both independent requests did not reach database barrier');
      await new Promise(setImmediate);
    }
    await lock.query('commit'); await lock.end(); lock = null;
    assert.deepEqual((await Promise.all([first, second])).map(r => r.status), [200, 200]);
    assert.equal((await checked(db.from('comun_archive_assets').select('id').eq('id', assetId))).length, 1);
  });
  await test('idempotency key replay with different content is rejected', async () => {
    const key = `audit-${run}`;
    const first = await request('/api/comun/admin/archive/upload-url', A.cookie, { archiveItemId: episode, filename: 'first.wav', role: 'radio_private_original', mimeType: 'audio/wav', sizeBytes: wav.length }, { 'Idempotency-Key': key });
    assert.equal(first.status, 200);
    const second = await request('/api/comun/admin/archive/upload-url', A.cookie, { archiveItemId: episode, filename: 'different.wav', role: 'radio_private_original', mimeType: 'audio/wav', sizeBytes: wav.length + 1 }, { 'Idempotency-Key': key });
    assert.equal(second.status, 409);
  });
  const faultName = `audit_fault_${run.replaceAll('-', '')}`;
  function fault(operation, predicate) {
    sql(`create function public.${faultName}() returns trigger language plpgsql as $$begin if ${predicate} then raise exception 'synthetic audit fault'; end if; return NEW; end$$;
      revoke all on function public.${faultName}() from public;
      create trigger ${faultName} before ${operation} on public.comun_archive_assets for each row execute function public.${faultName}();`);
  }
  function clearFault() { sql(`drop trigger if exists ${faultName} on public.comun_archive_assets; drop function if exists public.${faultName}();`); }
  await test('failure after private upload preserves bytes and can resume confirmation', async () => {
    fault('update', `NEW.id='${assetId}'::uuid`);
    try {
      assert.equal((await request('/api/comun/admin/archive/confirm-upload', A.cookie, { assetId })).status, 503);
      assert.equal((await db.storage.from('radio-private-originals').download(row.object_key)).error, null);
    } finally { clearFault(); }
    assert.equal((await request('/api/comun/admin/archive/confirm-upload', A.cookie, { assetId })).status, 200);
    return 'Real PostgreSQL trigger fault, not an unavailable Storage mock';
  });
  await test('real FFmpeg processing persists MP3 and waveform without editorial publication', async () => {
    const response = await request('/api/comun/admin/radio/process', A.cookie, { episodeId: episode, assetId });
    assert.equal(response.status, 200);
    const assets = await checked(db.from('comun_archive_assets').select('asset_role,bucket_scope,object_key').eq('archive_item_id', episode).in('asset_role', ['radio_public_episode', 'radio_waveform']));
    assert.equal(assets.length, 2);
    for (const a of assets) { objectKeys.push(['radio-public-audio', a.object_key]); assert.equal(a.bucket_scope, 'public_safe'); assert.equal((await db.storage.from('radio-public-audio').download(a.object_key)).error, null); }
    const e = await checked(db.from('comun_radio_episodes').select('publication_status').eq('archive_item_id', episode).single());
    assert.equal(e.publication_status, 'editorial_review');
  });
  await test('failure after FFmpeg before metadata persistence resumes explicitly', async () => {
    fault('insert', `NEW.archive_item_id='${episode}'::uuid and NEW.asset_role in ('radio_public_episode','radio_waveform')`);
    try {
      assert.notEqual((await request('/api/comun/admin/radio/process', A.cookie, { episodeId: episode, assetId })).status, 200);
      // Cross-system atomicity is not assumed: physical derivatives can precede DB metadata.
      const physical = await db.storage.from('radio-public-audio').info(`radio-public/${episode}/episode.mp3`);
      assert.equal(physical.error, null);
    } finally { clearFault(); }
    assert.equal((await request('/api/comun/admin/radio/process', A.cookie, { episodeId: episode, assetId })).status, 200);
    const rows = await checked(db.from('comun_archive_assets').select('id').eq('archive_item_id', episode).in('asset_role', ['radio_public_episode', 'radio_waveform']));
    assert.equal(rows.length, 2);
    return 'Real injected PostgreSQL failure; retry rebuilt derivatives and metadata';
  });
  await test('two processing requests at database barrier; B remains unauthorized during processing', async () => {
    assertOwned(s);
    lock = new pg.Client({ connectionString: env.DB_URL }); await lock.connect();
    await lock.query('begin'); await lock.query('lock table comun_admin_audit_log in share mode');
    const first = request('/api/comun/admin/radio/process', A.cookie, { episodeId: episode, assetId });
    const second = request('/api/comun/admin/radio/process', A.cookie, { episodeId: episode, assetId });
    const deadline = Date.now() + 30000;
    while (true) {
      const waiting = await lock.query("select count(*)::int n from pg_stat_activity where wait_event_type='Lock' and query ilike '%comun_admin_audit_log%' and pid<>pg_backend_pid()");
      if (waiting.rows[0].n >= 2) break;
      if (Date.now() > deadline) throw new Error('Processing requests did not both reach barrier');
      await new Promise(setImmediate);
    }
    assert.equal((await request('/api/comun/admin/radio/process', B.cookie, { episodeId: episode, assetId, userId: A.id })).status, 401);
    await lock.query('commit'); await lock.end(); lock = null;
    const responses = await Promise.all([first, second]);
    assert.deepEqual(responses.map(r => r.status), [200, 200]);
    const rows = await checked(db.from('comun_archive_assets').select('asset_role').eq('archive_item_id', episode).in('asset_role', ['radio_public_episode', 'radio_waveform']));
    assert.equal(rows.length, 2);
    return 'Independent HTTP/TCP requests, two real FFmpeg invocations; database start barrier';
  });
  await test('unpublished HTTP projection does not expose original or private reference', async () => {
    const r = await fetch(base + `/comun/radio/episodios/audit-${run}`);
    assert.equal(r.status, 404); const body = await r.text();
    assert.ok(!body.includes(row.object_key) && !body.includes(`private-${run}`));
  });
} catch (e) {
  results.push({ name: 'integration setup or required dependency', status: 'FAIL', reason: e.name, detail: String(e.message).replace(/https?:\/\/\S+/g, '[url]').slice(0, 250) });
} finally {
  if (lock) { await lock.query('rollback').catch(() => {}); await lock.end().catch(() => {}); }
  await test('cleanup owned fixtures only', async () => {
    assertOwned(s);
    for (const id of [...ids].reverse()) {
      const rows = await checked(db.from('comun_archive_assets').select('object_key,bucket_scope').eq('archive_item_id', id));
      for (const r of rows) if (r.object_key.startsWith(`radio-originals/${id}/`) || r.object_key.startsWith(`radio-public/${id}/`)) objectKeys.push([r.bucket_scope === 'private_original' ? 'radio-private-originals' : 'radio-public-audio', r.object_key]);
      await checked(db.from('comun_archive_items').delete().eq('id', id));
    }
    for (const [bucket, key] of objectKeys) { const r = await db.storage.from(bucket).remove([key]); assert.equal(r.error, null); }
    for (const id of users) { await checked(db.from('comun_admin_users').delete().eq('user_id', id)); assert.equal((await db.auth.admin.deleteUser(id)).error, null); }
    return { syntheticItems: ids.length, syntheticUsers: users.length };
  });
  if (app?.pid) {
    if (process.platform === 'win32') command('taskkill', ['/PID', String(app.pid), '/T', '/F']);
    else app.kill('SIGTERM');
  }
  fs.closeSync(appLog);
  fs.writeFileSync(report, JSON.stringify({ sha: command('git', ['rev-parse', 'HEAD']).trim(), run, results }, null, 2));
  console.log(JSON.stringify(results.map(({ name, status }) => ({ name, status }))));
  process.exitCode = results.some(r => r.status === 'FAIL') ? 1 : 0;
}
