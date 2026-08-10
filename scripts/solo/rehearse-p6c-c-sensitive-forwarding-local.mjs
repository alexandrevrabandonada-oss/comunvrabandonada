import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";

const base = (process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3160").replace(/\/$/, "");
const dbUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(dbUrl))
  throw new Error("COMUN_P6C_C_LOCAL_DATABASE_REQUIRED");
if (process.env.COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED !== "enabled")
  throw new Error("COMUN_P6C_C_WAVE1_FLAG_REQUIRED");
if (process.env.COMUN_CHILD_PROTECTION_CHANNEL_ONLY_ENABLED !== "enabled")
  throw new Error("COMUN_P6C_C_WAVE2_FLAG_REQUIRED");
if (process.env.COMUN_RELATA_COLLECTIVE_ENABLED === "enabled")
  throw new Error("COMUN_P6C_C_COLLECTIVES_MUST_BE_OFF");

const secret = () => randomBytes(32).toString("base64url");
const requested = [];
let hardDeletes = 0;

class Jar {
  values = new Map();
  header() { return [...this.values].map(([name, value]) => `${name}=${value}`).join("; "); }
  absorb(response) {
    const values = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie") ?? ""];
    for (const value of values) for (const part of value.split(/,(?=[^;,]+=)/)) {
      const pair = part.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator > 0) this.values.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  }
}

const primary = new Jar();
async function http(path, init = {}, jar = primary) {
  const url = `${base}${path}`;
  assert.ok(url.startsWith(`${base}/`), "external request refused");
  if (String(init.method ?? "GET").toUpperCase() === "DELETE") hardDeletes += 1;
  requested.push(url);
  const headers = new Headers(init.headers);
  if (jar.header()) headers.set("cookie", jar.header());
  const response = await fetch(url, { ...init, headers });
  jar.absorb(response);
  return response;
}

async function post(path, value, jar = primary) {
  return http(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  }, jar);
}

async function capture(text, jar = primary, extra = {}) {
  const receiptSecret = secret();
  const response = await post("/api/comun/relata", {
    text,
    answers: {},
    hasPhoto: false,
    captureMode: "quick_v2",
    idempotencyKey: secret(),
    receiptSecret,
    ...extra,
  }, jar);
  const value = await response.json();
  assert.equal(response.status, 201, JSON.stringify(value));
  assert.ok(value.walletItemId);
  assert.equal(value.noOfficialSend, true);
  return { ...value, receiptSecret };
}

async function expectJson(response, status) {
  const value = await response.json();
  assert.equal(response.status, status, JSON.stringify(value));
  return value;
}

const output = [];
const port = new URL(base).port;
const built = process.env.COMUN_R2A_USE_BUILT_SERVER === "1";
const serverArgs = ["node_modules/next/dist/bin/next", built ? "start" : "dev"];
if (!built) serverArgs.push("--webpack");
serverArgs.push("-p", port);
const server = spawn(process.execPath, serverArgs, {
  cwd: process.cwd(), env: process.env, shell: false,
  detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"],
});
for (const stream of [server.stdout, server.stderr]) stream.on("data", (chunk) => {
  output.push(String(chunk));
  if (output.length > 140) output.shift();
});
async function stop() {
  if (server.exitCode !== null) return;
  try {
    if (process.platform !== "win32" && server.pid) process.kill(-server.pid, "SIGTERM");
    else if (server.pid) await new Promise((resolve) => {
      const killer = spawn("taskkill.exe", ["/pid", String(server.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
      killer.once("exit", resolve); killer.once("error", resolve);
    });
  } catch {}
}

const db = new pg.Client({ connectionString: dbUrl });
try {
  let ready = false;
  for (let index = 0; index < 120; index += 1) {
    try { if ((await fetch(`${base}/comun/relatar`)).status === 200) { ready = true; break; } } catch {}
    if (server.exitCode !== null) throw new Error(`COMUN_P6C_C_SERVER_EXIT_${server.exitCode}\n${output.join("")}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.equal(ready, true, output.join(""));
  await db.connect();

  const initial = await db.query(`select
    (select count(*)::int from public.comun_relata_public_snapshots) public_snapshots,
    (select count(*)::int from private.comun_forwarding_packages) packages,
    (select count(*)::int from private.comun_forwarding_attempts) attempts`);

  const rawSentinel = `P6CC-RAW-${randomUUID()}`;
  const photoSentinel = randomUUID();
  const accountSentinel = randomUUID();
  const unitSentinel = `P6CC-UNIT-${randomUUID()}`;
  const safeSummary = "Quero informar que o serviço não estava disponível no período indicado.";
  const health = await capture(`A UBS está sem médico hoje. Código sintético ${rawSentinel}.`);
  assert.equal(health.receipt.category, "public_health");

  const healthRows = await db.query(`select c.id case_id,c.report_id,wi.wallet_id
    from public.comun_relata_cases c join private.comun_participation_wallet_items wi
      on wi.subject_ref=c.id::text and wi.id=$1 where c.protocol=$2`,
    [health.walletItemId, health.receipt.protocol]);
  assert.equal(healthRows.rowCount, 1);
  await db.query(`select * from public.comun_relata_begin_attachment($1,$2,$3,'image/jpeg','under_1mb')`,
    [health.receipt.protocol, health.receiptSecret, photoSentinel]);
  await db.query(`insert into private.comun_participation_wallet_account_links(wallet_id,user_id,link_method)
    values($1,$2,'explicit_account_link')`, [healthRows.rows[0].wallet_id, accountSentinel]);
  const location = await post("/api/comun/relata/evidence/location", {
    longitude: -44.125678, latitude: -22.512345, origin: "map_pin",
    accuracyMeters: null, capturedAt: "2026-08-10T12:00:00.000Z",
  });
  assert.equal(location.status, 200, await location.text());

  const healthDisclosure = {
    includeIssueType: true,
    includeUnitLabel: false,
    unitLabel: unitSentinel,
    includeNetworkLabel: false,
    networkLabel: "",
    includeApproximatePeriod: true,
    approximatePeriod: "nas últimas semanas",
    includePersonAuthoredSummary: true,
    personAuthoredSummary: safeSummary,
  };
  const healthPreview = await expectJson(await post(
    `/api/comun/sensitive-forwarding/packages/${health.walletItemId}/preview`, healthDisclosure), 200);
  assert.equal(healthPreview.preview.channelOnly, false);
  assert.ok(healthPreview.preview.institutionalText.includes("Saúde pública"));
  assert.ok(healthPreview.preview.institutionalText.includes(safeSummary));
  assert.equal(healthPreview.preview.institutionalText.includes(rawSentinel), false);
  assert.equal(healthPreview.preview.institutionalText.includes(unitSentinel), false);
  assert.ok(healthPreview.preview.notSharedItems.includes("identidade da conta"));

  const warning = await post(`/api/comun/sensitive-forwarding/packages/${health.walletItemId}/preview`, {
    ...healthDisclosure, personAuthoredSummary: "Meu CPF é 123.456.789-00",
  });
  assert.equal(warning.status, 422);
  const healthPrepared = await expectJson(await post(
    `/api/comun/sensitive-forwarding/packages/${health.walletItemId}/prepare`,
    {
      ...healthDisclosure,
      authorizationConfirmed: true,
      authorizationProof: healthPreview.authorizationProof,
      authorizationExpiresAt: healthPreview.authorizationExpiresAt,
    }), 201);
  const healthPackage = healthPrepared.package.package_id;
  assert.ok(healthPackage);
  const healthPreparedAgain = await expectJson(await post(
    `/api/comun/sensitive-forwarding/packages/${health.walletItemId}/prepare`,
    {
      ...healthDisclosure,
      authorizationConfirmed: true,
      authorizationProof: healthPreview.authorizationProof,
      authorizationExpiresAt: healthPreview.authorizationExpiresAt,
    }), 201);
  assert.equal(healthPreparedAgain.package.package_id, healthPackage);
  const alteredAuthorization = await post(
    `/api/comun/sensitive-forwarding/packages/${health.walletItemId}/prepare`,
    {
      ...healthDisclosure,
      includeApproximatePeriod: false,
      approximatePeriod: "",
      authorizationConfirmed: true,
      authorizationProof: healthPreview.authorizationProof,
      authorizationExpiresAt: healthPreview.authorizationExpiresAt,
    },
  );
  assert.equal(alteredAuthorization.status, 404);
  const healthDb = await db.query(`select p.*,c.category,r.original_text,
      (select count(*)::int from private.comun_relata_attachments a where a.report_id=r.id) attachments,
      (select count(*)::int from private.comun_relata_private_locations l where l.report_id=r.id and l.evidence_state='added_private') locations,
      (select count(*)::int from private.comun_participation_wallet_account_links al where al.wallet_id=p.wallet_id and al.user_id=$2) account_links
    from private.comun_forwarding_packages p join public.comun_relata_cases c on c.id=p.relata_case_id
    join private.comun_relata_reports r on r.id=c.report_id where p.id=$1`, [healthPackage, accountSentinel]);
  const healthRow = healthDb.rows[0];
  assert.equal(healthRow.source_domain, "sensitive_service");
  assert.equal(healthRow.policy_identifier, "health_minimal_v1");
  assert.equal(healthRow.disclosure_manifest.includeUnitLabel, false);
  assert.equal(healthRow.disclosure_manifest.includePersonAuthoredSummary, true);
  assert.equal(healthRow.attachments, 1);
  assert.equal(healthRow.locations, 1);
  assert.equal(healthRow.account_links, 1);
  const serializedHealth = JSON.stringify({
    subject: healthRow.subject, text: healthRow.institutional_text,
    manifest: healthRow.disclosure_manifest,
  });
  for (const forbidden of [rawSentinel, photoSentinel, accountSentinel, unitSentinel, "-44.125678", "-22.512345"])
    assert.equal(serializedHealth.includes(forbidden), false);

  const healthList = await expectJson(await http(
    `/api/comun/sensitive-forwarding/packages/${health.walletItemId}`), 200);
  assert.ok(healthList.channels.length > 0);
  assert.ok(healthList.channels.every((channel) => !("destination" in channel)));
  const healthChannel = healthList.channels.find((channel) => channel.id === "br-ouvsus-v1") ?? healthList.channels[0];
  const opened = await expectJson(await post(
    `/api/comun/sensitive-forwarding/packages/${health.walletItemId}/${healthPackage}/open`,
    { channelId: healthChannel.id }), 200);
  assert.match(opened.destination, /^(https:\/\/|tel:)/);
  assert.equal(opened.destination.includes("?") || opened.destination.includes("#"), false);
  assert.equal(opened.attempt.attempt_state, "prepared");
  const openedAgain = await expectJson(await post(
    `/api/comun/sensitive-forwarding/packages/${health.walletItemId}/${healthPackage}/open`,
    { channelId: healthChannel.id }), 200);
  assert.equal(openedAgain.attempt.attempt_id, opened.attempt.attempt_id);
  const sent = await expectJson(await post(
    `/api/comun/sensitive-forwarding/attempts/${opened.attempt.attempt_id}/declare-sent`, { sent: true }), 200);
  assert.equal(sent.attempt.attempt_state, "person_declared_sent");
  assert.equal(sent.attempt.due_at, null);
  const responded = await expectJson(await post(
    `/api/comun/sensitive-forwarding/attempts/${opened.attempt.attempt_id}/response`, {
      outcome: "return_received", note: "Houve retorno institucional.", officialProtocol: "SINTETICO-001",
    }), 200);
  assert.equal(responded.attempt.attempt_state, "responded");

  const educationRaw = `P6CC-EDU-RAW-${randomUUID()}`;
  const education = await capture(`A escola está sem professor há semanas. Código sintético ${educationRaw}.`);
  assert.equal(education.receipt.category, "public_education");
  const educationDisclosure = {
    includeIssueType: true, includeUnitLabel: false, unitLabel: "",
    includeNetworkLabel: true, networkLabel: "Municipal",
    includeApproximatePeriod: false, approximatePeriod: "",
    includePersonAuthoredSummary: false, personAuthoredSummary: "",
  };
  const educationPreview = await expectJson(await post(
    `/api/comun/sensitive-forwarding/packages/${education.walletItemId}/preview`,
    educationDisclosure), 200);
  const educationPrepared = await expectJson(await post(
    `/api/comun/sensitive-forwarding/packages/${education.walletItemId}/prepare`,
    {
      ...educationDisclosure,
      authorizationConfirmed: true,
      authorizationProof: educationPreview.authorizationProof,
      authorizationExpiresAt: educationPreview.authorizationExpiresAt,
    }), 201);
  assert.equal(educationPrepared.package.policy_identifier, "education_minimal_v1");
  assert.equal(educationPrepared.package.institutional_text.includes(educationRaw), false);
  const educationList = await expectJson(await http(
    `/api/comun/sensitive-forwarding/packages/${education.walletItemId}`), 200);
  assert.ok(educationList.channels.every((channel) => !("destination" in channel)));

  const childRaw = `P6CC-CHILD-RAW-${randomUUID()}`;
  const child = await capture(`Há uma situação grave de proteção envolvendo uma criança. Código sintético ${childRaw}.`);
  assert.equal(child.receipt.category, "child_protection");
  const emptyDisclosure = {
    includeIssueType: false, includeUnitLabel: false, unitLabel: "",
    includeNetworkLabel: false, networkLabel: "",
    includeApproximatePeriod: false, approximatePeriod: "",
    includePersonAuthoredSummary: false, personAuthoredSummary: "",
  };
  const childPreview = await expectJson(await post(
    `/api/comun/sensitive-forwarding/packages/${child.walletItemId}/preview`, emptyDisclosure), 200);
  assert.equal(childPreview.preview.channelOnly, true);
  assert.equal(childPreview.preview.institutionalText, null);
  const childPrepared = await expectJson(await post(
    `/api/comun/sensitive-forwarding/packages/${child.walletItemId}/prepare`,
    {
      ...emptyDisclosure,
      authorizationConfirmed: true,
      authorizationProof: childPreview.authorizationProof,
      authorizationExpiresAt: childPreview.authorizationExpiresAt,
    }), 201);
  assert.equal(childPrepared.package.policy_identifier, "child_protection_channel_only_v1");
  assert.equal(childPrepared.package.institutional_text, "Conteúdo será informado diretamente pela pessoa ao canal.");
  assert.equal(childPrepared.package.institutional_text.includes(childRaw), false);
  assert.deepEqual(childPrepared.package.disclosure_manifest, {
    policy: "child_protection_channel_only_v1", includeIssueType: false,
    includeUnitLabel: false, includeNetworkLabel: false,
    includeApproximatePeriod: false, includePersonAuthoredSummary: false,
    channelOnly: true,
  });
  const childList = await expectJson(await http(
    `/api/comun/sensitive-forwarding/packages/${child.walletItemId}`), 200);
  assert.ok(childList.channels.every((channel) => !("destination" in channel)));
  const childChannel = childList.channels.find((channel) => channel.id === "br-disque-100-child-protection-v1");
  assert.ok(childChannel);
  const childOpen = await expectJson(await post(
    `/api/comun/sensitive-forwarding/packages/${child.walletItemId}/${childPrepared.package.package_id}/open`,
    { channelId: childChannel.id }), 200);
  assert.equal(childOpen.attempt.attempt_state, "prepared");
  await expectJson(await post(
    `/api/comun/sensitive-forwarding/attempts/${childOpen.attempt.attempt_id}/declare-sent`, { sent: true }), 200);
  const genericResponseBypass = await post(
    `/api/comun/essential-services/attempts/${childOpen.attempt.attempt_id}/response`,
    { note: "bypass sensível", officialProtocol: "", resolved: false });
  assert.equal(genericResponseBypass.status, 404);
  const childFreeText = await post(
    `/api/comun/sensitive-forwarding/attempts/${childOpen.attempt.attempt_id}/response`,
    { outcome: "return_received", note: "detalhe que não deve ser guardado", officialProtocol: "" });
  assert.equal(childFreeText.status, 404);
  const childResponse = await expectJson(await post(
    `/api/comun/sensitive-forwarding/attempts/${childOpen.attempt.attempt_id}/response`,
    { outcome: "situation_forwarded", note: "", officialProtocol: "PROT-SINTETICO" }), 200);
  assert.equal(childResponse.attempt.attempt_state, "responded");

  const wrongWallet = new Jar();
  assert.equal((await http("/api/comun/participation-wallet", { method: "POST" }, wrongWallet)).status, 201);
  assert.equal((await http(`/api/comun/sensitive-forwarding/packages/${health.walletItemId}`, {}, wrongWallet)).status, 404);
  const forged = await capture("A UBS está sem médico hoje.", primary, { category: "public_lighting" });
  assert.equal(forged.receipt.category, "public_health");

  assert.equal((await post(`/api/comun/sensitive-forwarding/packages/${healthPackage}/withdraw`, {})).status, 200);
  const retired = await db.query(`select p.state,p.subject,p.institutional_text,p.content_withdrawn_at,p.disclosure_manifest,
      a.official_protocol,a.response_note,(select count(*)::int from private.comun_forwarding_events e where e.package_id=p.id) events
    from private.comun_forwarding_packages p left join private.comun_forwarding_attempts a on a.package_id=p.id
    where p.id=$1`, [healthPackage]);
  assert.equal(retired.rows[0].state, "withdrawn");
  assert.equal(retired.rows[0].institutional_text, "Conteúdo retirado pela pessoa.");
  assert.equal(retired.rows[0].official_protocol, null);
  assert.equal(retired.rows[0].response_note, null);
  assert.ok(retired.rows[0].content_withdrawn_at);
  assert.ok(retired.rows[0].events >= 5);

  const security = await db.query(`select
    (select relrowsecurity and relforcerowsecurity from pg_class where oid='private.comun_forwarding_packages'::regclass) packages_rls,
    (select relrowsecurity and relforcerowsecurity from pg_class where oid='private.comun_forwarding_attempts'::regclass) attempts_rls,
    (select relrowsecurity and relforcerowsecurity from pg_class where oid='private.comun_forwarding_events'::regclass) events_rls,
    has_function_privilege('anon','public.comun_sensitive_assisted_prepare(text,uuid,boolean,boolean,text,boolean,text,boolean,text,boolean,text,boolean)','EXECUTE') anon_prepare,
    has_function_privilege('authenticated','public.comun_sensitive_assisted_prepare(text,uuid,boolean,boolean,text,boolean,text,boolean,text,boolean,text,boolean)','EXECUTE') authenticated_prepare,
    has_function_privilege('service_role','public.comun_sensitive_assisted_prepare(text,uuid,boolean,boolean,text,boolean,text,boolean,text,boolean,text,boolean)','EXECUTE') service_prepare`);
  assert.deepEqual(security.rows[0], {
    packages_rls: true, attempts_rls: true, events_rls: true,
    anon_prepare: false, authenticated_prepare: false, service_prepare: true,
  });

  const completeLeakSurface = await db.query(`select coalesce(jsonb_agg(x),'[]'::jsonb) payload from (
    select p.subject,p.institutional_text,p.disclosure_manifest,null::text as official_protocol,null::text as response_note
    from private.comun_forwarding_packages p where p.source_domain='sensitive_service'
    union all
    select null,null,null,a.official_protocol,a.response_note from private.comun_forwarding_attempts a
    join private.comun_forwarding_packages p on p.id=a.package_id where p.source_domain='sensitive_service'
    union all
    select null,null,null,e.result_code,null from private.comun_forwarding_events e
    join private.comun_forwarding_packages p on p.id=e.package_id where p.source_domain='sensitive_service'
  ) x`);
  const leakSurface = JSON.stringify(completeLeakSurface.rows[0].payload);
  for (const forbidden of [rawSentinel, photoSentinel, accountSentinel, unitSentinel, educationRaw, childRaw, "-44.125678", "-22.512345"])
    assert.equal(leakSurface.includes(forbidden), false);
  const serverLog = output.join("");
  for (const forbidden of [rawSentinel, photoSentinel, accountSentinel, unitSentinel, educationRaw, childRaw])
    assert.equal(serverLog.includes(forbidden), false);

  const finalState = await db.query(`select
    (select count(*)::int from public.comun_relata_public_snapshots) public_snapshots,
    (select count(*)::int from public.comun_collective_cases) collectives`);
  assert.equal(finalState.rows[0].public_snapshots, initial.rows[0].public_snapshots);
  assert.equal(hardDeletes, 0);
  assert.ok(requested.every((url) => url.startsWith(`${base}/`)));

  console.log(JSON.stringify({
    result: "COMUN_P6C_C_SENSITIVE_DISCLOSURE_NO_LEAK_GREEN",
    disposable: "COMUN_P6C_C_SENSITIVE_ASSISTED_FORWARDING_DISPOSABLE_E2E_GREEN",
    health: "minimal_explicit_disclosure",
    education: "minimal_explicit_disclosure",
    childProtection: "channel_only",
    preparedIsNotSent: true,
    differentiatedRetention: "content_scrubbed_events_preserved",
    externalRequests: 0,
    publicSnapshots: finalState.rows[0].public_snapshots,
    collectives: finalState.rows[0].collectives,
    hardDeletes,
  }));
} finally {
  if (db._connected) await db.end();
  await stop();
}
