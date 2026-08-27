#!/usr/bin/env node

import process from "node:process";

// This is deliberately an explicit, small manifest. A migration that is not
// listed here is unknown and must block the historical gate until its owner is
// recorded. It is not safe to infer ownership from a future filename.
export const MIGRATION_LANE_MANIFEST = Object.freeze({
  "20260810194054_comun_sensitive_assisted_forwarding.sql": "p6c-c",
  "20260813124308_comun_pautas_vivas_public_evidence.sql": "48-3-a1",
  "20260815184529_comun_solidarity_offers.sql": "48-4-a0",
  "20260815223006_comun_solidarity_organization_access.sql": "48-4-a2",
  "20260816011500_comun_solidarity_economic_content_writes.sql": "48-4-a0",
  "20260816181040_comun_solidarity_organization_onboarding.sql": "48-4-a4",
  "20260816224228_comun_solidarity_private_connections.sql": "48-4-a5",
  "20260817012247_comun_solidarity_organization_profile_self_management.sql": "48-4-a0",
  "20260817160000_comun_cultural_contribution_intakes.sql": "culture-a2",
  "20260817170000_comun_cultural_contribution_intakes_r1.sql": "culture-a2-r1",
  "20260818120000_comun_cultural_specialized_handoff.sql": "culture-a3",
  "20260819130000_comun_cultural_progressive_rights.sql": "culture-a4",
  "20260823003249_comun_cultural_specialized_provenance_readiness.sql": "culture-a5-a1",
  "20260824001340_comun_artwork_submission_private_materialization.sql": "culture-a5-a2",
  "20260825090000_comun_multidomain_assisted_forwarding.sql": "culture-a1",
  "20260825120000_comun_followup_escalation_continuity.sql": "culture-a3",
  "20260826090000_comun_denuncias_public_collective_projection.sql": "culture-b0",
  "20260826120000_comun_denuncias_public_projection_opt_in.sql": "culture-b1",
  "20260826150000_comun_denuncias_public_evidence_pauta_bridge.sql": "culture-b2-a1",
  "20260827120000_comun_denuncias_private_collective_matching.sql": "culture-b2-a2",
});

const NON_APPLICABLE_LANES = Object.freeze({
  "48-2-a": new Set(["48-3-a1", "48-4-a0", "culture-a2", "culture-a2-r1", "culture-a3", "culture-a4", "culture-a5-a1", "culture-a5-a2", "culture-a1", "culture-b0", "culture-b1", "culture-b2-a1", "culture-b2-a2", "p6c-c"]),
  "48-3-a1": new Set(["48-4-a0", "culture-a2", "culture-a2-r1", "culture-a3", "culture-a4", "culture-a5-a1", "culture-a5-a2", "culture-a1", "culture-b0", "culture-b1", "culture-b2-a1", "culture-b2-a2", "p6c-c"]),
  "48-3-b0": new Set(["48-3-a1", "48-4-a0", "culture-a2", "culture-a2-r1", "culture-a3", "culture-a4", "culture-a5-a1", "culture-a5-a2", "culture-a1", "culture-b0", "culture-b1", "culture-b2-a1", "culture-b2-a2", "p6c-c"]),
  "48-3-e2": new Set(["48-3-a1", "48-4-a0", "culture-a2", "culture-a2-r1", "culture-a3", "culture-a4", "culture-a5-a1", "culture-a5-a2", "culture-a1", "culture-b0", "culture-b1", "culture-b2-a1", "culture-b2-a2", "p6c-c"]),
  "48-4-a0": new Set(["48-3-a1", "48-4-a2", "48-4-a4", "48-4-a5", "culture-a2", "culture-a2-r1", "culture-a3", "culture-a4", "culture-a5-a1", "culture-a5-a2", "culture-a1", "culture-b0", "culture-b1", "culture-b2-a1", "culture-b2-a2", "p6c-c"]),
  "48-5-a0": new Set(["48-3-a1", "48-4-a0", "culture-a2", "culture-a2-r1", "culture-a3", "culture-a4", "culture-a5-a1", "culture-a5-a2", "culture-a1", "culture-b0", "culture-b1", "culture-b2-a1", "culture-b2-a2", "p6c-c"]),
  "p6c-c": new Set(["48-3-a1", "48-4-a0", "culture-a2", "culture-a2-r1", "culture-a3", "culture-a4", "culture-a5-a1", "culture-a5-a2", "culture-a1", "culture-b0", "culture-b1", "culture-b2-a1", "culture-b2-a2"]),
  "48-4-a2": new Set(["48-3-a1", "48-4-a0", "culture-a2", "culture-a2-r1", "culture-a3", "culture-a4", "culture-a5-a1", "culture-a5-a2", "culture-a1", "culture-b0", "culture-b1", "culture-b2-a1", "culture-b2-a2", "p6c-c"]),
  "48-4-a4": new Set(["48-3-a1", "48-4-a0", "culture-a2", "culture-a2-r1", "culture-a3", "culture-a4", "culture-a5-a1", "culture-a5-a2", "culture-a1", "culture-b0", "culture-b1", "culture-b2-a1", "culture-b2-a2", "p6c-c"]),
  "48-4-a5": new Set(["48-3-a1", "48-4-a0", "culture-a2", "culture-a2-r1", "culture-a3", "culture-a4", "culture-a5-a1", "culture-a5-a2", "culture-a1", "culture-b0", "culture-b1", "culture-b2-a1", "culture-b2-a2", "p6c-c"]),
  "48-4-a7": new Set(["48-3-a1", "48-4-a0", "culture-a2", "culture-a2-r1", "culture-a3", "culture-a4", "culture-a5-a1", "culture-a5-a2", "culture-a1", "culture-b0", "culture-b1", "culture-b2-a1", "culture-b2-a2", "p6c-c"]),
  "culture-b2-a1": new Set(["culture-b2-a2"]),
  "culture-b2-a2": new Set([])
});

function migrationBasename(file) {
  return file.replaceAll("\\", "/").split("/").at(-1);
}

export function classifyMigrationLane(lane, files) {
  if (!NON_APPLICABLE_LANES[lane]) throw new Error(`unknown lane: ${lane}`);
  const normalized = files.map(migrationBasename).filter(Boolean);
  if (normalized.length === 0) return { mode: "none", lane, files: [] };

  const classifications = normalized.map((file) => ({
    file,
    owner: MIGRATION_LANE_MANIFEST[file] ?? "unknown"
  }));
  const unknown = classifications.filter((entry) => entry.owner === "unknown");
  if (unknown.length > 0) {
    return {
      mode: "blocked",
      lane,
      files: classifications,
      reason: `unknown migration ownership: ${unknown.map((entry) => entry.file).join(", ")}`
    };
  }

  const owners = new Set(classifications.map((entry) => entry.owner));
  if (owners.size === 1 && owners.has(lane)) {
    return { mode: "candidate", lane, files: classifications };
  }
  if ([...owners].every((owner) => NON_APPLICABLE_LANES[lane].has(owner))) {
    return { mode: "not_applicable", lane, files: classifications };
  }
  return {
    mode: "blocked",
    lane,
    files: classifications,
    reason: `mixed or unowned lane change for ${lane}: ${[...owners].join(", ")}`
  };
}

function parseArgs(argv) {
  const laneIndex = argv.indexOf("--lane");
  if (laneIndex < 0 || !argv[laneIndex + 1]) throw new Error("--lane is required");
  const filesIndex = argv.indexOf("--files");
  return { lane: argv[laneIndex + 1], files: filesIndex < 0 ? [] : argv.slice(filesIndex + 1) };
}

if (process.argv[1]?.endsWith("classify-migration-lane.mjs")) {
  try {
    const result = classifyMigrationLane(...Object.values(parseArgs(process.argv.slice(2))));
    console.log(`COMUN_MIGRATION_LANE_MODE=${result.mode}`);
    console.log(`COMUN_MIGRATION_LANE=${result.lane}`);
    if (result.reason) console.error(`COMUN_MIGRATION_LANE_REASON=${result.reason}`);
    if (result.mode === "blocked") process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
