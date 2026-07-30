import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const AUTH_MIGRATION =
  "supabase/migrations/20260729205156_allow_anonymous_sidewalk_auth_without_legacy_profile.sql";
const unsafeLookup =
  "where oid = 'public.handle_new_user()'::pg_catalog.regprocedure";
const safeLookup =
  "where oid = pg_catalog.to_regprocedure('public.handle_new_user()')";

export function createDisposableResetCompatibilityPatch(source) {
  const occurrences = source.split(unsafeLookup).length - 1;
  if (occurrences !== 1)
    throw new Error("COMUN_PAUTA_ACTION_CYCLE_RESET_PATCH_SOURCE_INVALID");
  return source.replace(unsafeLookup, safeLookup);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(`COMUN_PAUTA_ACTION_CYCLE_LOCAL_RESET_FAILED_${code}`),
          ),
    );
  });
}

export async function runCompleteDisposableReset(
  command = "supabase",
  args = ["db", "reset", "--local", "--yes"],
) {
  const original = await readFile(AUTH_MIGRATION, "utf8");
  const compatible = createDisposableResetCompatibilityPatch(original);
  try {
    await writeFile(AUTH_MIGRATION, compatible, "utf8");
    await run(command, args);
  } finally {
    await writeFile(AUTH_MIGRATION, original, "utf8");
  }
  const restored = await readFile(AUTH_MIGRATION, "utf8");
  if (restored !== original)
    throw new Error("COMUN_PAUTA_ACTION_CYCLE_RESET_SOURCE_NOT_RESTORED");
  process.stdout.write(
    "COMUN_PAUTA_ACTION_CYCLE_COMPLETE_LOCAL_HISTORY_GREEN\n",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] ?? "reset";
  const args =
    mode === "start"
      ? ["start"]
      : mode === "reset"
        ? ["db", "reset", "--local", "--yes"]
        : null;
  if (!args) throw new Error("COMUN_PAUTA_ACTION_CYCLE_LOCAL_MODE_INVALID");
  runCompleteDisposableReset("supabase", args).catch((error) => {
    process.stderr.write(
      `${String(error?.message ?? "COMUN_PAUTA_ACTION_CYCLE_RESET_FAILED")}\n`,
    );
    process.exitCode = 1;
  });
}
