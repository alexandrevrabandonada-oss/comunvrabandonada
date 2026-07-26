export const COLLECTIVE_ACTIONS_RELEASE = "20260726133409-comun-collective-actions-foundation";
export const COLLECTIVE_ACTIONS_MIGRATION_PATH = "supabase/migrations/20260726133409_comun_collective_actions_foundation.sql";
export const COLLECTIVE_ACTIONS_MIGRATION_SHA256 = "e5c1638637e9baa7c8d0f57f73caab775cd4c183cd3472355e061125121005eb";
export const COLLECTIVE_ACTIONS_PAUSED_MESSAGE = "As Ações Coletivas estão sendo preparadas no COMUN.";

export type CollectiveActionsLedgerRow = {
  release?: string | null;
  status?: string | null;
  migration_path?: string | null;
  migration_sha256?: string | null;
};

export function hasExactCollectiveActionsLedger(row: CollectiveActionsLedgerRow | null | undefined) {
  return Boolean(row && row.release === COLLECTIVE_ACTIONS_RELEASE && row.status === "applied" && row.migration_path === COLLECTIVE_ACTIONS_MIGRATION_PATH && row.migration_sha256 === COLLECTIVE_ACTIONS_MIGRATION_SHA256);
}

export function isCollectiveActionsPreviewFixturesEnabled(env: { VERCEL_ENV?: string; COMUN_COLLECTIVE_ACTIONS_PREVIEW_FIXTURES?: string } = process.env as { VERCEL_ENV?: string; COMUN_COLLECTIVE_ACTIONS_PREVIEW_FIXTURES?: string }) {
  return env.VERCEL_ENV === "preview" && env.COMUN_COLLECTIVE_ACTIONS_PREVIEW_FIXTURES === "enabled";
}

export function isCollectiveActionsReleaseEnabled(flag: string | undefined, ledger: CollectiveActionsLedgerRow | null | undefined, tablesPresent: boolean) {
  return flag === "enabled" && (hasExactCollectiveActionsLedger(ledger) || tablesPresent);
}
