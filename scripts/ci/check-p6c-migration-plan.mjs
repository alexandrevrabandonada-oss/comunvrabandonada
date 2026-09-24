#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { classifyMigrationLane } from "./classify-migration-lane.mjs";

export function assessP6cPlan(lane, changed, planned) {
  const change = classifyMigrationLane(lane, changed);
  if (change.mode === "blocked")
    throw new Error(
      `COMUN_${lane.toUpperCase()}_CHANGED_MIGRATION_BLOCKED: ${change.reason}`,
    );
  const classified = planned.map((file) => classifyMigrationLane(lane, [file]));
  const blocked = classified.find((item) => item.mode === "blocked");
  if (blocked)
    throw new Error(
      `COMUN_${lane.toUpperCase()}_PLANNED_MIGRATION_BLOCKED: ${blocked.reason}`,
    );
  const own = classified
    .filter((item) => item.mode === "candidate")
    .map((item) => item.files[0].file);
  if (own.length > 0 && classified.length !== own.length) {
    throw new Error(`COMUN_${lane.toUpperCase()}_MIXED_DOMAIN_MIGRATION_PLAN`);
  }
  const expectedOwn =
    change.mode === "candidate"
      ? change.files.map((item) => item.file).sort()
      : [];
  if (JSON.stringify(own.sort()) !== JSON.stringify(expectedOwn)) {
    throw new Error(
      `COMUN_${lane.toUpperCase()}_UNEXPECTED_DOMAIN_MIGRATION_PLAN`,
    );
  }
  return {
    lane,
    changedMode: change.mode,
    domainMigrationCount: own.length,
    foreignKnownPendingCount: classified.length - own.length,
    businessRowsRead: false,
  };
}

if (process.argv[1]?.endsWith("check-p6c-migration-plan.mjs")) {
  const args = process.argv.slice(2);
  const value = (flag) => {
    const index = args.indexOf(flag);
    return index < 0 ? undefined : args[index + 1];
  };
  const lane = value("--lane");
  const base = value("--base");
  const dryRun = value("--dry-run");
  const output = value("--output");
  if (
    !["p6c-b1", "p6c-b2"].includes(lane) ||
    !/^[a-f0-9]{40}$/.test(base ?? "")
  )
    throw new Error("invalid lane or PR base SHA");
  const changed = execFileSync(
    "git",
    ["diff", "--name-only", `${base}...HEAD`, "--", "supabase/migrations"],
    { encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  const planned = dryRun
    ? [
        ...new Set(
          readFileSync(dryRun, "utf8").match(/20\d{12}_[a-z0-9_]+\.sql/g) ?? [],
        ),
      ].sort()
    : [];
  const result = dryRun
    ? assessP6cPlan(lane, changed, planned)
    : classifyMigrationLane(lane, changed);
  if (result.mode === "blocked") throw new Error(result.reason);
  if (dryRun && output)
    writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
}
