import crypto from "node:crypto";
import pg from "pg";

const EXPECTED_PROJECT_REF = "nvmdszymrtacfehdynpg";
const REPORT_FROM = "2026-08-08T00:28:03Z";
const REPORT_TO = "2026-08-08T00:28:07Z";
const LOCATION_FROM = "2026-08-08T00:28:06Z";
const LOCATION_TO = "2026-08-08T00:28:10Z";

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(code) {
  console.error(code);
  process.exitCode = 2;
  return null;
}

function validateConnection() {
  const value = process.env.SUPABASE_DB_URL;
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (!value || !projectRef) return fail("COMUN_P3B_CLEANUP_BLOCKED_CURRENT_ROTATED_DB_SECRET_UNAVAILABLE");
  if (projectRef !== EXPECTED_PROJECT_REF) return fail("COMUN_P3B_CLEANUP_BLOCKED_WRONG_PROJECT");
  let url;
  try { url = new URL(value); } catch { return fail("COMUN_P3B_CLEANUP_BLOCKED_INVALID_DB_URL"); }
  if (!/^postgres(?:ql):$/.test(url.protocol) || !url.hostname || /localhost|127\\.0\\.0\\.1|::1/i.test(url.hostname)) {
    return fail("COMUN_P3B_CLEANUP_BLOCKED_INVALID_DB_HOST");
  }
  if (!url.hostname.includes(EXPECTED_PROJECT_REF) && !url.hostname.endsWith("pooler.supabase.com")) {
    return fail("COMUN_P3B_CLEANUP_BLOCKED_WRONG_DB_HOST");
  }
  return value;
}

const candidateSql = `
with candidates as (
  select
    r.id as report_id,
    c.id as case_id,
    l.id as location_id,
    r.created_at as report_created_at,
    c.created_at as case_created_at,
    l.created_at as location_created_at,
    c.category,
    encode(extensions.digest(convert_to(r.original_text, 'utf8'), 'sha256'), 'hex') as text_hash,
    char_length(r.original_text) as text_length
  from private.comun_relata_reports r
  join public.comun_relata_cases c on c.report_id = r.id
  join private.comun_relata_private_locations l on l.report_id = r.id
  where r.created_at >= $1::timestamptz and r.created_at <= $2::timestamptz
    and l.created_at >= $3::timestamptz and l.created_at <= $4::timestamptz
    and l.evidence_state = 'added_private' and l.withdrawn_at is null
    and c.state <> 'withdrawn' and c.withdrawn_at is null
    and not exists (select 1 from public.comun_relata_public_snapshots ps where ps.case_id = c.id)
), enriched as (
  select c.*,
    (select count(*)::int from private.comun_participation_wallet_items wi
      where wi.item_type='relata_report' and wi.subject_ref=c.case_id::text and wi.archived_at is null) as wallet_item_count,
    (select count(*)::int from private.comun_participation_wallet_items wi
      where wi.item_type='relata_report' and wi.subject_ref=c.case_id::text) as wallet_item_total,
    (select count(*)::int from private.comun_participation_wallets w
      join private.comun_participation_wallet_items wi on wi.wallet_id=w.id
      where wi.item_type='relata_report' and wi.subject_ref=c.case_id::text) as wallet_count,
    (select count(*)::int from private.comun_participation_wallet_account_links al
      join private.comun_participation_wallet_items wi on wi.wallet_id=al.wallet_id
      where wi.item_type='relata_report' and wi.subject_ref=c.case_id::text and al.revoked_at is null) as account_link_count,
    (select count(*)::int from private.comun_relata_attachments a where a.report_id=c.report_id) as attachment_count,
    (select count(*)::int from public.comun_relata_evidence_consents ec
      where ec.case_id=c.case_id and ec.consent_kind='collective_grouping' and ec.active) as collective_count,
    case when to_regclass('public.comun_sidewalk_forwardings') is null then 0
      else (select count(*)::int from public.comun_sidewalk_forwardings sf where sf.report_id=c.report_id)
    end as forwarding_count
  from candidates c
)
select * from enriched order by report_created_at, report_id;
`;

async function findCandidates(client) {
  const result = await client.query(candidateSql, [REPORT_FROM, REPORT_TO, LOCATION_FROM, LOCATION_TO]);
  return result.rows;
}

function fingerprint(row) {
  return crypto.createHash("sha256").update(`${row.report_id}:${row.case_id}:${row.location_id}`).digest("hex");
}

function sanitized(row, rows) {
  return {
    candidateCount: rows.length,
    activeLocationCount: rows.length,
    category: row?.category ?? null,
    createdMinute: row ? new Date(row.report_created_at).toISOString().slice(0, 16) + "Z" : null,
    textHash: row?.text_hash ?? null,
    textLength: row?.text_length ?? 0,
    walletItemCount: row?.wallet_item_count ?? 0,
    accountLinkCount: row?.account_link_count ?? 0,
    attachmentCount: row?.attachment_count ?? 0,
    publicSnapshotCount: 0,
    collectiveCount: row?.collective_count ?? 0,
    forwardingCount: row?.forwarding_count ?? 0,
    fixtureFingerprint: row ? fingerprint(row) : null,
  };
}

async function main() {
  const mode = arg("mode") ?? "identify";
  const authorization = arg("authorization") ?? "";
  const connection = validateConnection();
  if (!connection) return;
  const client = new pg.Client({ connectionString: connection, application_name: "comun-p3b-orphan-cleanup" });
  await client.connect();
  try {
    const rows = await findCandidates(client);
    if (rows.length === 0) return console.log(JSON.stringify({ result: "COMUN_P3B_CLEANUP_BLOCKED_FIXTURE_NOT_FOUND", ...sanitized(null, rows) }));
    if (rows.length !== 1) return console.log(JSON.stringify({ result: "COMUN_P3B_CLEANUP_BLOCKED_FIXTURE_NOT_UNIQUE", ...sanitized(rows[0], rows) }));
    const row = rows[0];
    const fixtureFingerprint = fingerprint(row);
    if (mode === "identify") {
      return console.log(JSON.stringify({ result: "COMUN_P3B_ORPHAN_FIXTURE_IDENTIFIED_EXACTLY_ONE", ...sanitized(row, rows) }));
    }
    if (mode !== "cleanup") return fail("COMUN_P3B_CLEANUP_BLOCKED_INVALID_MODE");
    if (authorization !== `AUTORIZO_P3B_SYNTHETIC_CLEANUP_${fixtureFingerprint}`) return fail("COMUN_P3B_CLEANUP_BLOCKED_AUTHORIZATION_MISMATCH");
    if (row.collective_count !== 0 || row.forwarding_count !== 0 || row.attachment_count !== 0) return fail("COMUN_P3B_CLEANUP_BLOCKED_UNEXPECTED_RELATION");

    await client.query("begin");
    const locked = (await client.query(`
      select r.id as report_id, c.id as case_id, l.id as location_id
      from private.comun_relata_reports r
      join public.comun_relata_cases c on c.report_id=r.id
      join private.comun_relata_private_locations l on l.report_id=r.id
      where r.id=$1 and c.id=$2 and l.id=$3
        and c.state='stored_private' and c.withdrawn_at is null
        and r.withdrawn_at is null and l.evidence_state='added_private' and l.withdrawn_at is null
      for update`, [row.report_id, row.case_id, row.location_id])).rows;
    if (locked.length !== 1) throw new Error("COMUN_P3B_CLEANUP_BLOCKED_STATE_CHANGED");
    const now = new Date();
    const locationUpdate = await client.query(`update private.comun_relata_private_locations set evidence_state='withdrawn', withdrawn_at=coalesce(withdrawn_at,$1) where id=$2`, [now, row.location_id]);
    if (locationUpdate.rowCount !== 1) throw new Error("COMUN_P3B_CLEANUP_BLOCKED_LOCATION_UPDATE");
    const caseUpdate = await client.query(`update public.comun_relata_cases set state='withdrawn', withdrawn_at=$1, updated_at=$1 where id=$2 and state='stored_private' and withdrawn_at is null`, [now, row.case_id]);
    if (caseUpdate.rowCount !== 1) throw new Error("COMUN_P3B_CLEANUP_BLOCKED_CASE_UPDATE");
    const reportUpdate = await client.query(`update private.comun_relata_reports set withdrawn_at=$1, retention_class='withdrawn', updated_at=$1 where id=$2 and withdrawn_at is null`, [now, row.report_id]);
    if (reportUpdate.rowCount !== 1) throw new Error("COMUN_P3B_CLEANUP_BLOCKED_REPORT_UPDATE");
    await client.query(`insert into public.comun_relata_status_events(case_id,state,actor,result_code,occurred_at) values($1,'withdrawn','system_local','RELATA_SYNTHETIC_FIXTURE_CLEANUP',$2)`, [row.case_id, now]);

    const walletRows = (await client.query(`select wi.id, wi.wallet_id from private.comun_participation_wallet_items wi where wi.item_type='relata_report' and wi.subject_ref=$1 for update`, [row.case_id])).rows;
    if (walletRows.length > 1) throw new Error("COMUN_P3B_CLEANUP_BLOCKED_WALLET_ITEM_NOT_UNIQUE");
    if (walletRows.length === 1) {
      const wallet = walletRows[0];
      const activeOther = await client.query(`select count(*)::int as count from private.comun_participation_wallet_items where wallet_id=$1 and archived_at is null and id<>$2`, [wallet.wallet_id, wallet.id]);
      const links = await client.query(`select count(*)::int as count from private.comun_participation_wallet_account_links where wallet_id=$1 and revoked_at is null`, [wallet.wallet_id]);
      if (activeOther.rows[0].count !== 0 || links.rows[0].count !== 0) throw new Error("COMUN_P3B_CLEANUP_BLOCKED_WALLET_NOT_EXCLUSIVELY_SYNTHETIC");
      await client.query(`update private.comun_participation_wallet_items set archived_at=$1, updated_at=$1 where id=$2 and archived_at is null`, [now, wallet.id]);
      await client.query(`insert into private.comun_participation_wallet_events(wallet_id,item_id,event_type,result_code,created_at) values($1,$2,'item_archived','RELATA_SYNTHETIC_FIXTURE_CLEANUP',$3)`, [wallet.wallet_id, wallet.id, now]);
      await client.query(`update private.comun_participation_wallets set status='revoked', revoked_at=coalesce(revoked_at,$1) where id=$2 and status='active'`, [now, wallet.wallet_id]);
      await client.query(`update private.comun_participation_wallet_recovery_credentials set active=false, revoked_at=coalesce(revoked_at,$1) where wallet_id=$2 and active=true`, [now, wallet.wallet_id]);
    }
    await client.query("commit");
    const verify = await client.query(`
      select
        (select count(*)::int from private.comun_relata_private_locations where id=$1 and evidence_state='added_private' and withdrawn_at is null) as active_location,
        (select count(*)::int from private.comun_relata_private_locations where id=$1 and evidence_state='withdrawn' and withdrawn_at is not null) as withdrawn_location,
        (select count(*)::int from public.comun_relata_cases where id=$2 and state='withdrawn' and withdrawn_at is not null) as withdrawn_case,
        (select count(*)::int from private.comun_relata_reports where id=$3 and retention_class='withdrawn' and withdrawn_at is not null) as withdrawn_report,
        (select count(*)::int from private.comun_participation_wallet_items where item_type='relata_report' and subject_ref=$2 and archived_at is null) as active_wallet_item`, [row.location_id, row.case_id, row.report_id]);
    const v = verify.rows[0];
    if (v.active_location !== 0 || v.withdrawn_location !== 1 || v.withdrawn_case !== 1 || v.withdrawn_report !== 1 || v.active_wallet_item !== 0) throw new Error("COMUN_P3B_CLEANUP_BLOCKED_POSTFLIGHT");
    console.log(JSON.stringify({ result: "COMUN_P3B_SYNTHETIC_CLEANUP_GREEN", fixtureFingerprint, candidateCount: 1, activeLocationCount: 0, withdrawnLocationCount: 1, withdrawnCaseCount: 1, withdrawnReportCount: 1, activeWalletItemCount: 0, transactionCommitted: true, hardDeletes: 0, plaintextLocationRead: false }));
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

await main();
