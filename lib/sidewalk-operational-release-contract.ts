export const SIDEWALK_OPERATIONAL_RELEASE =
  "20260724233256-comun-sidewalk-operational-hardening";
export const SIDEWALK_OPERATIONAL_MIGRATION_PATH =
  "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql";
export const SIDEWALK_OPERATIONAL_MIGRATION_SHA256 =
  "6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be";
export const SIDEWALK_OPERATIONAL_PAUSED_MESSAGE =
  "O envio de novos registros está temporariamente pausado enquanto concluímos uma atualização operacional. O mapa e os registros publicados continuam disponíveis.";

export type SidewalkOperationalReleaseLedgerRow = {
  release?: string | null;
  status?: string | null;
  migration_path?: string | null;
  migration_sha256?: string | null;
};

export function hasExactSidewalkOperationalLedger(
  row: SidewalkOperationalReleaseLedgerRow | null | undefined,
) {
  return Boolean(
    row &&
      row.release === SIDEWALK_OPERATIONAL_RELEASE &&
      row.status === "applied" &&
      row.migration_path === SIDEWALK_OPERATIONAL_MIGRATION_PATH &&
      row.migration_sha256 === SIDEWALK_OPERATIONAL_MIGRATION_SHA256,
  );
}

export function isSidewalkOperationalReleaseEnabled(
  flag: string | undefined,
  row: SidewalkOperationalReleaseLedgerRow | null | undefined,
) {
  return flag === "enabled" && hasExactSidewalkOperationalLedger(row);
}
