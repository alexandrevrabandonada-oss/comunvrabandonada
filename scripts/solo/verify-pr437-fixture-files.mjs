import { readFile } from "node:fs/promises";
import { requireFixtureFiles } from "./pr437-search-proof-contract.mjs";

const directory = "tests/fixtures/pr437-post";
const fixture = JSON.parse(
  await readFile(`${directory}/fixture-manifest.json`, "utf8"),
);
const files = Object.fromEntries(
  await Promise.all(
    Object.keys(fixture.files).map(async (name) => [
      name,
      await readFile(`${directory}/${name}`),
    ]),
  ),
);
requireFixtureFiles(fixture, files);
if (
  !/^public\.ecr\.aws\/supabase\/postgres@sha256:[a-f0-9]{64}$/.test(
    fixture.postgresImage,
  )
)
  throw new Error("COMUN_SEARCH_LINT_DISPOSABLE_IMAGE_UNPINNED");
console.log("COMUN_PR437_DISPOSABLE_FIXTURE_FILES_VERIFIED");
