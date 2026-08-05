import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
if (args[0] !== "--" || args.length < 2) {
  throw new Error("Uso: node scripts/relata/with-local-migrations.mjs -- <comando> [args]");
}

const manifestsDir = path.join(root, "supabase", "local-releases");
const targetDir = path.join(root, "supabase", "migrations");
const quarantine = path.join(root, ".local", "local-migration-materialization");
await mkdir(targetDir, { recursive: true });
await mkdir(quarantine, { recursive: true });

const manifestNames = (await readdir(manifestsDir)).filter((name) => name.endsWith(".json")).sort();
const copied = [];
try {
  for (const name of manifestNames) {
    const manifest = JSON.parse(await readFile(path.join(manifestsDir, name), "utf8"));
    const source = path.join(root, manifest.migration);
    const target = path.join(targetDir, path.basename(manifest.migration));
    const backup = path.join(quarantine, path.basename(manifest.migration));
    await copyFile(source, target);
    copied.push({ target, backup });
  }
  const command = args[1];
  const commandArgs = args.slice(2);
  const child = spawn(command, commandArgs, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  const exitCode = await new Promise((resolve) => {
    child.on("exit", (code, signal) => resolve(signal ? 1 : (code ?? 1)));
  });
  process.exitCode = exitCode;
} finally {
  for (const entry of copied.reverse()) {
    await rm(entry.target, { force: true });
  }
  await rm(quarantine, { recursive: true, force: true });
}
