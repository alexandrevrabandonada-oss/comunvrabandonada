import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

const sizes = [25, 50, 100, 500, 1000];
const runs = [];
for (const size of sizes) {
  const documents = Array.from({ length: size }, (_, index) => ({
    id: index,
    title: `Documento público sintético ${String(index).padStart(4, "0")}`,
    summary:
      index % 7 === 0
        ? "calçada acessível e mobilidade"
        : "memória territorial pública",
    state: index % 3 === 0 ? "active" : "published",
  }));
  const started = performance.now();
  const filtered = documents.filter((document) =>
    document.summary.includes("calçada"),
  );
  const ordered = filtered.toSorted((left, right) =>
    left.title.localeCompare(right.title, "pt-BR"),
  );
  const pages = Array.from(
    { length: Math.ceil(ordered.length / 25) },
    (_, index) => ordered.slice(index * 25, index * 25 + 25),
  );
  const durationMs = Number((performance.now() - started).toFixed(3));
  assert.equal(documents.length, size);
  assert.ok(pages.every((page) => page.length <= 25));
  assert.equal(new Set(documents.map((document) => document.id)).size, size);
  runs.push({
    items: size,
    matched: filtered.length,
    pages: pages.length,
    pageSize: 25,
    durationMs,
  });
}
assert.equal(runs.at(-1)?.items, 1000);
assert.ok((runs.at(-1)?.durationMs ?? Infinity) < 1000);

const report = {
  schemaVersion: 1,
  result: "COMUN_QUALITY_SYNTHETIC_LOAD_GREEN",
  fixture: "memory_only_public_synthetic",
  runs,
};
if (process.argv.includes("--write-report")) {
  const target = path.join(
    process.cwd(),
    "reports/generated/comun-quality-load.json",
  );
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, {
    mode: 0o600,
  });
}
console.log(JSON.stringify(report));
