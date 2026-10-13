import { rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Playwright has stopped these dev servers before the static check. Preserve
// production route types and application sources; only their disposable dev
// output is retired. Next typegen rebuilds canonical route types afterwards.
export function cleanDisposableDevTypes(root = process.cwd()) {
  for (const distDir of [".next", ".next-miniapp-experience"]) {
    rmSync(join(root, distDir, "dev"), { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  cleanDisposableDevTypes();
}
