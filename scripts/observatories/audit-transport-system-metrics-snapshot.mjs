import { readFile } from "node:fs/promises";

const [snapshot, manifest] = await Promise.all([
  readFile(new URL("../../data/comun/transport/system-metrics-v1.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../../data/comun/transport/system-metrics-sources-v1.json", import.meta.url), "utf8").then(JSON.parse),
]);
const sourceIds = new Set(manifest.sources.map((source) => source.sourceId));
const { passengers, fleet, costs, technicalFare, publicFare } = snapshot.metrics;
const passengerTotal = passengers.items[0].value + passengers.items[1].value + passengers.items[2].value;
const valid =
  snapshot.snapshotId === "comun-transport-system-metrics-v1-20260811" &&
  snapshot.previousSnapshotId === null &&
  snapshot.sources.every((sourceId) => sourceIds.has(sourceId)) &&
  passengerTotal === passengers.items[3].value &&
  fleet.operating.value + fleet.reserve.value === fleet.total.value &&
  Math.abs(costs.variableMonthly.value + costs.fixedMonthly.value - costs.totalMonthly.value) <= 0.01 &&
  technicalFare.value === 5.9354 &&
  publicFare.value === 5.9;

if (!valid) throw new Error("COMUN_48_2_C2_SNAPSHOT_CONTRACT_INVALID");
console.log(JSON.stringify({ result: "COMUN_48_2_C2_SNAPSHOT_AUDIT_GREEN", snapshotId: snapshot.snapshotId, sourceCount: snapshot.sources.length, pmm: "deferred_source_format_ambiguity" }));
