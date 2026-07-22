import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const OWNER = "alexandrevrabandonada-oss";
export const REPO = "comunvrabandonada";
export const PR_NUMBER = 23;
export const CANONICAL_BRANCH = "codex/sprint-40-1-mobile-preview";

export function arg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

export async function loadFixture() {
  const file = arg("fixture");
  return file ? JSON.parse(await readFile(file, "utf8")) : null;
}

export function requiredEnv(names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`PR23_MISSING_SECRETS:${missing.join(",")}`);
}

export async function github(pathname, token = process.env.GITHUB_TOKEN) {
  if (!token) throw new Error("PR23_GITHUB_TOKEN_MISSING");
  const response = await fetch(`https://api.github.com${pathname}`, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "comun-pr23-gate",
    },
  });
  if (!response.ok) throw new Error(`PR23_GITHUB_API_${response.status}`);
  return response.json();
}

export async function writeGenerated(name, json, markdown) {
  const directory = arg("output-dir") ?? "reports/generated";
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${name}.json`), `${JSON.stringify(json, null, 2)}\n`);
  await writeFile(path.join(directory, `${name}.md`), `${markdown.trim()}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, `${markdown.trim()}\n`, { flag: "a" });
}

export function fail(message) {
  console.error(message);
  process.exitCode = 1;
}
