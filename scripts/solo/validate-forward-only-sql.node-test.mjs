import assert from "node:assert/strict";
import { test } from "node:test";
import {
  selectSingleChangedManifest,
  validateForwardOnlySqlText,
} from "./validate-forward-only-sql.mjs";

const release = {
  release: "20260724233256-comun-sidewalk-operational-hardening",
  destructiveSql: false,
  expectedBlockingFindings: 0,
  platformObservationsAllowed: true,
  releaseLedger: "public.comun_schema_releases",
};

const allowedMigration = `
begin;
alter table public.comun_sidewalk_records alter column public_summary drop not null;
revoke trigger, truncate on table
  public.comun_actions, public.comun_admin_audit_log, public.comun_admin_users,
  public.comun_communities, public.comun_dossiers, public.comun_issues,
  public.comun_pauta_evidence_items, public.comun_pauta_spaces, public.comun_pauta_tasks,
  public.comun_public_lookup_events, public.comun_report_attachments, public.comun_reports
from anon, authenticated;
commit;
`;

test("validator accepts only the documented baseline grant repair", () => {
  assert.doesNotThrow(() =>
    validateForwardOnlySqlText(release, allowedMigration),
  );
});

test("operational hardening without its sidewalk statement fails", () => {
  assert.throws(
    () => validateForwardOnlySqlText(release, "begin; select 1; commit;"),
    /SOLO_PUBLIC_SUMMARY_NULLABILITY_EXCEPTION_INVALID/,
  );
});

test("a generic additive release does not require a sidewalk statement", () => {
  assert.doesNotThrow(() =>
    validateForwardOnlySqlText(
      { ...release, release: "20260914130000-radio-release" },
      "begin; create schema if not exists private; commit;",
    ),
  );
});

test("zero or two changed release manifests fail closed", () => {
  assert.throws(
    () => selectSingleChangedManifest([]),
    /SOLO_RELEASE_MANIFEST_COUNT_INVALID/,
  );
  assert.throws(
    () =>
      selectSingleChangedManifest([
        "A\tsupabase/releases/one.json",
        "A\tsupabase/releases/two.json",
      ]),
    /SOLO_RELEASE_MANIFEST_COUNT_INVALID/,
  );
});

test("migration requires exactly one begin/commit transaction", () => {
  assert.throws(
    () =>
      validateForwardOnlySqlText(
        { ...release, release: "20260914130000-radio-release" },
        "create schema if not exists private;",
      ),
    /SOLO_CANONICAL_TRANSACTION_BOUNDARY_INVALID/,
  );
});

test("validator rejects an additional destructive statement", () => {
  assert.throws(
    () =>
      validateForwardOnlySqlText(
        release,
        allowedMigration.replace(
          "commit;",
          "drop table public.comun_reports; commit;",
        ),
      ),
    /SOLO_CANONICAL_RELEASE_DESTRUCTIVE_SQL/,
  );
});

test("validator rejects a broadened grant-repair allowlist", () => {
  assert.throws(
    () =>
      validateForwardOnlySqlText(
        release,
        allowedMigration.replace(
          "public.comun_reports",
          "public.comun_reports, public.unrelated_table",
        ),
      ),
    /SOLO_LEGACY_GRANT_REPAIR_EXCEPTION_INVALID/,
  );
});

test("validator accepts the additive P4 release without the historical sidewalk summary exception", () => {
  const p4Release = {
    release: "20260808180246-comun-sidewalk-relata-real",
    destructiveSql: false,
    expectedBlockingFindings: 0,
    platformObservationsAllowed: true,
    releaseLedger: "public.comun_schema_releases",
  };

  assert.doesNotThrow(() =>
    validateForwardOnlySqlText(
      p4Release,
      "begin; create table private.comun_sidewalk_relata_intakes (id uuid primary key); commit;",
    ),
  );
});
