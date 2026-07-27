export const saferPreFixtureId = "sidewalk-operational-safer-pre-v2";

export const saferPreLegacyTables = Object.freeze([
  "comun_actions",
  "comun_admin_audit_log",
  "comun_admin_users",
  "comun_communities",
  "comun_dossiers",
  "comun_issues",
  "comun_pauta_evidence_items",
  "comun_pauta_spaces",
  "comun_pauta_tasks",
  "comun_public_lookup_events",
  "comun_report_attachments",
  "comun_reports",
]);

export const saferPrePublicRoles = Object.freeze(["anon", "authenticated"]);
export const saferPrePublicPrivileges = Object.freeze([
  "references",
  "trigger",
  "truncate",
]);

export const saferPreFixtureSql = `
revoke ${saferPrePublicPrivileges.join(", ")} on table
  ${saferPreLegacyTables.map((table) => `public.${table}`).join(",\n  ")}
from ${saferPrePublicRoles.join(", ")};`;
