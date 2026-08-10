import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const base = (process.env.COMUN_BASE_URL ?? "https://comunsocial.online").replace(/\/$/, "");
const dbUrl = process.env.SUPABASE_DB_URL ?? "";
const wave = process.env.P6CC_WAVE ?? "";
const runMarker = process.env.ATTEMPT_ID ?? `P6CC-SMOKE-${randomUUID()}`;
if (!/^https:\/\//.test(base)) throw new Error("COMUN_P6C_C_PRODUCTION_HTTPS_REQUIRED");
if (!/^postgres(?:ql)?:\/\//.test(dbUrl)) throw new Error("COMUN_P6C_C_CURRENT_DB_SECRET_REQUIRED");
if (!['wave1','wave2'].includes(wave)) throw new Error("COMUN_P6C_C_WAVE_INVALID");
if (!/^P6CC-SMOKE-[A-Za-z0-9._:-]{8,180}$/.test(runMarker)) throw new Error("COMUN_P6C_C_ATTEMPT_ID_INVALID");

const proof = () => randomBytes(32).toString("base64url");
const db = new pg.Client({ connectionString: dbUrl });
const fixtures = [];
let externalRequests = 0;

class Jar {
  values = new Map();
  header() { return [...this.values].map(([name, value]) => `${name}=${value}`).join("; "); }
  absorb(response) {
    const values = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie() : [response.headers.get("set-cookie") ?? ""];
    for (const value of values) for (const part of value.split(/,(?=[^;,]+=)/)) {
      const pair = part.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator > 0) this.values.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  }
}

async function request(path, init, jar) {
  const url = `${base}${path}`;
  if (!url.startsWith(`${base}/`)) {
    externalRequests += 1;
    throw new Error("COMUN_P6C_C_EXTERNAL_REQUEST_REFUSED");
  }
  const headers = new Headers(init?.headers);
  if (jar?.header()) headers.set("cookie", jar.header());
  const response = await fetch(url, { ...init, headers });
  jar?.absorb(response);
  return response;
}

async function post(path, value, jar) {
  return request(path, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value),
  }, jar);
}

async function capture(label, text, category) {
  const jar = new Jar();
  const rawMarker = `${runMarker}-${label}`;
  const response = await post("/api/comun/relata", {
    text: `${text} TESTE SINTETICO PRIVADO ${rawMarker}.`, answers: {}, hasPhoto: false,
    captureMode: "quick_v2", idempotencyKey: proof(), receiptSecret: proof(),
  }, jar);
  const body = await response.json().catch(() => ({}));
  assert.equal(response.status, 201, `${label}:capture_failed`);
  assert.equal(body.receipt?.category, category, `${label}:category`);
  assert.equal(body.noOfficialSend, true);
  assert.ok(body.walletItemId);
  const fixture = { label, jar, rawMarker, protocol: body.receipt.protocol, walletItemId: body.walletItemId, category, packageId: null };
  fixtures.push(fixture);
  return fixture;
}

async function prepareAndOpen(fixture) {
  const channelOnly = fixture.category === "child_protection";
  const disclosure = {
    includeIssueType: !channelOnly, includeUnitLabel: false, unitLabel: "",
    includeNetworkLabel: false, networkLabel: "",
    includeApproximatePeriod: false, approximatePeriod: "",
    includePersonAuthoredSummary: false, personAuthoredSummary: "",
  };
  const previewResponse = await post(`/api/comun/sensitive-forwarding/packages/${fixture.walletItemId}/preview`, disclosure, fixture.jar);
  const preview = await previewResponse.json().catch(() => ({}));
  assert.equal(previewResponse.status, 200, `${fixture.label}:preview`);
  assert.equal(preview.preview?.channelOnly, channelOnly);
  assert.equal(JSON.stringify(preview).includes(fixture.rawMarker), false);

  const prepareResponse = await post(`/api/comun/sensitive-forwarding/packages/${fixture.walletItemId}/prepare`, {
    ...disclosure,
    authorizationConfirmed: true,
    authorizationProof: preview.authorizationProof,
    authorizationExpiresAt: preview.authorizationExpiresAt,
  }, fixture.jar);
  const prepared = await prepareResponse.json().catch(() => ({}));
  assert.equal(prepareResponse.status, 201, `${fixture.label}:prepare`);
  fixture.packageId = prepared.package?.package_id;
  assert.ok(fixture.packageId);
  assert.equal(JSON.stringify(prepared.package).includes(fixture.rawMarker), false);

  const listResponse = await request(`/api/comun/sensitive-forwarding/packages/${fixture.walletItemId}`, {}, fixture.jar);
  const listed = await listResponse.json().catch(() => ({}));
  assert.equal(listResponse.status, 200, `${fixture.label}:list`);
  assert.ok(listed.channels?.length > 0);
  assert.ok(listed.channels.every((channel) => !("destination" in channel)));
  const channel = listed.channels[0];
  const openResponse = await post(
    `/api/comun/sensitive-forwarding/packages/${fixture.walletItemId}/${fixture.packageId}/open`,
    { channelId: channel.id }, fixture.jar,
  );
  const opened = await openResponse.json().catch(() => ({}));
  assert.equal(openResponse.status, 200, `${fixture.label}:open_prepare_only`);
  assert.equal(opened.attempt?.attempt_state, "prepared");
  assert.match(opened.destination ?? "", /^(https:\/\/|tel:)/);
  assert.equal((opened.destination ?? "").includes("?"), false);
}

async function rowsForProtocols() {
  if (!fixtures.length) return [];
  return (await db.query(`select c.protocol,c.state case_state,c.withdrawn_at case_withdrawn_at,
      r.withdrawn_at report_withdrawn_at,r.retention_class,wi.id wallet_item_id,wi.wallet_id,
      wi.archived_at wallet_item_archived_at,w.status wallet_status,
      (select count(*)::int from private.comun_participation_wallet_items x where x.wallet_id=w.id) wallet_item_total,
      (select count(*)::int from private.comun_participation_wallet_account_links x where x.wallet_id=w.id and x.revoked_at is null) account_link_count,
      (select count(*)::int from private.comun_forwarding_packages p where p.relata_case_id=c.id and p.withdrawn_at is null) active_package_count,
      (select count(*)::int from private.comun_forwarding_attempts a join private.comun_forwarding_packages p on p.id=a.package_id where p.relata_case_id=c.id and p.withdrawn_at is null and a.state<>'abandoned') active_attempt_count,
      (select count(*)::int from public.comun_relata_public_snapshots s where s.case_id=c.id) snapshot_count
    from public.comun_relata_cases c join private.comun_relata_reports r on r.id=c.report_id
    left join private.comun_participation_wallet_items wi on wi.subject_ref=c.id::text and wi.item_type='relata_report'
    left join private.comun_participation_wallets w on w.id=wi.wallet_id
    where c.protocol=any($1::text[]) order by c.protocol`, [fixtures.map((item) => item.protocol)])).rows;
}

async function archiveExclusiveWallet(row) {
  if (!row.wallet_id || !row.wallet_item_id || row.wallet_item_total !== 1 || row.account_link_count !== 0)
    throw new Error("COMUN_P6C_C_CLEANUP_WALLET_NOT_EXCLUSIVELY_SYNTHETIC");
  await db.query("update private.comun_participation_wallet_items set archived_at=coalesce(archived_at,now()),updated_at=now() where id=$1", [row.wallet_item_id]);
  await db.query("insert into private.comun_participation_wallet_events(wallet_id,item_id,event_type,result_code) values($1,$2,'item_archived','P6CC_SYNTHETIC_FIXTURE_CLEANUP')", [row.wallet_id,row.wallet_item_id]);
  await db.query("update private.comun_participation_wallet_recovery_credentials set active=false,revoked_at=coalesce(revoked_at,now()) where wallet_id=$1 and active", [row.wallet_id]);
  await db.query("update private.comun_participation_wallets set status='revoked',revoked_at=coalesce(revoked_at,now()) where id=$1", [row.wallet_id]);
}

async function softCleanup() {
  for (const fixture of fixtures) {
    if (fixture.packageId) {
      const withdrawn = await post(`/api/comun/sensitive-forwarding/packages/${fixture.packageId}/withdraw`, {}, fixture.jar);
      assert.equal(withdrawn.status, 200, `${fixture.label}:package_withdraw`);
    }
    const report = await request("/api/comun/relata/receipt", { method: "DELETE" }, fixture.jar);
    assert.equal(report.status, 200, `${fixture.label}:report_withdraw`);
  }
  await db.query("begin");
  try {
    const rows = await rowsForProtocols();
    assert.equal(rows.length, fixtures.length);
    for (const row of rows) await archiveExclusiveWallet(row);
    await db.query("commit");
  } catch (error) {
    await db.query("rollback").catch(() => {});
    throw error;
  }
}

async function postflight() {
  const rows = await rowsForProtocols();
  return {
    activeSyntheticReports: rows.filter((row) => !row.report_withdrawn_at && row.retention_class !== "withdrawn").length,
    activeSyntheticCases: rows.filter((row) => !row.case_withdrawn_at && row.case_state !== "withdrawn").length,
    activeSyntheticWalletItems: rows.filter((row) => row.wallet_item_id && !row.wallet_item_archived_at).length,
    activeSyntheticWallets: rows.filter((row) => row.wallet_status === "active").length,
    activeSensitivePackages: rows.reduce((sum,row) => sum + Number(row.active_package_count ?? 0),0),
    activeAttempts: rows.reduce((sum,row) => sum + Number(row.active_attempt_count ?? 0),0),
    publicSnapshots: rows.reduce((sum,row) => sum + Number(row.snapshot_count ?? 0),0),
    collectives: 0, externalRequests, hardDeletes: 0,
  };
}

await db.connect();
let smokeError;
try {
  if (wave === "wave1") {
    await prepareAndOpen(await capture("health", "Uma UBS está sem médico hoje.", "public_health"));
    await prepareAndOpen(await capture("education", "A escola está sem professor há semanas.", "public_education"));
  } else {
    await prepareAndOpen(await capture("child", "Há uma situação grave de proteção envolvendo uma criança.", "child_protection"));
  }
  const rows = await db.query(`select p.id,p.source_domain,p.policy_identifier,p.institutional_text,p.disclosure_manifest,
      c.category,(select count(*)::int from private.comun_forwarding_attempts a where a.package_id=p.id and a.state='prepared') prepared_attempts
    from private.comun_forwarding_packages p join public.comun_relata_cases c on c.id=p.relata_case_id
    where p.id=any($1::uuid[])`, [fixtures.map((item) => item.packageId)]);
  assert.equal(rows.rowCount, fixtures.length);
  for (const row of rows.rows) {
    const fixture = fixtures.find((item) => item.packageId === row.id);
    assert.equal(row.source_domain, "sensitive_service");
    assert.equal(row.prepared_attempts, 1);
    assert.equal(row.institutional_text.includes(fixture.rawMarker), false);
    assert.equal(row.disclosure_manifest.channelOnly, row.category === "child_protection");
    if (row.category === "child_protection")
      assert.equal(row.institutional_text, "Conteúdo será informado diretamente pela pessoa ao canal.");
  }
} catch (error) {
  smokeError = error;
} finally {
  try { if (fixtures.length) await softCleanup(); } catch (error) { smokeError ??= error; }
}

const after = await postflight();
await db.end().catch(() => {});
assert.deepEqual(after, {
  activeSyntheticReports: 0, activeSyntheticCases: 0, activeSyntheticWalletItems: 0,
  activeSyntheticWallets: 0, activeSensitivePackages: 0, activeAttempts: 0,
  publicSnapshots: 0, collectives: 0, externalRequests: 0, hardDeletes: 0,
});
if (smokeError) throw smokeError;
console.log(JSON.stringify({
  result: wave === "wave1"
    ? "COMUN_P6C_C_SENSITIVE_FORWARDING_WAVE1_PRODUCTION_GREEN"
    : "COMUN_P6C_C_CHILD_CHANNEL_ONLY_WAVE2_PRODUCTION_GREEN",
  wave, fixtures: fixtures.length, preparedOnly: true, personDeclaredSent: false, ...after,
}));
