import { readFile } from "node:fs/promises";

const readJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(relativePath, import.meta.url)));

const manifest = await readJson("../../data/comun/transport/source-manifest-v2.json");
const snapshot = await readJson("../../data/comun/transport/programmed-network-v2.json");
const pointer = await readJson("../../data/comun/transport/active-snapshot.json");

const sourceIds = new Set(manifest.sources.map((source) => source.sourceId));
const missingReferences = snapshot.lines.flatMap((line) =>
  [line.catalogSourceId ?? snapshot.catalogSourceId, line.timetableSourceId, line.itinerarySourceId]
    .filter(Boolean)
    .filter((sourceId) => !sourceIds.has(sourceId))
    .map((sourceId) => `${line.lineCode}:${sourceId}`),
);

if (pointer.activeSnapshotId !== snapshot.snapshotId || snapshot.previousSnapshotId !== "comun-transport-programmed-network-v1-20260811" || snapshot.lineCount !== snapshot.lines.length || missingReferences.length > 0) {
  throw new Error("COMUN_48_2_C1_SNAPSHOT_CONTRACT_INVALID");
}

console.log(
  JSON.stringify({
    result: "COMUN_48_2_C1_SNAPSHOT_AUDIT_GREEN",
    snapshotId: snapshot.snapshotId,
    lineCount: snapshot.lineCount,
    sourceCount: manifest.sources.length,
    partialLines: snapshot.lines
      .filter((line) => line.timetableStatus === "partial" || line.itineraryStatus === "partial")
      .map((line) => line.lineCode),
    conflictLines: snapshot.lines
      .filter((line) => line.timetableStatus === "source_conflict" || line.itineraryStatus === "source_conflict")
      .map((line) => line.lineCode),
  }),
);
