import { execFileSync } from "node:child_process";

const api = (args) => execFileSync("gh", args, { encoding: "utf8" }).trim();
const checks = JSON.parse(api(["pr", "checks", process.env.PR, "--json", "name,state,link"]));
const failed = checks.filter((check) => !new Set(["SUCCESS", "SKIPPED", "NEUTRAL"]).has(check.state));
if (failed.length) throw new Error(`SOLO_PREVIEW_CHECKS_NOT_GREEN:${failed.map((check) => check.name).join(",")}`);
const vercel = checks.find((check) => /vercel/i.test(check.name) && /^https:\/\//.test(check.link ?? ""));
if (!vercel) throw new Error("SOLO_VERCEL_PREVIEW_NOT_FOUND");
const response = await fetch(vercel.link, { redirect: "follow" });
if (!response.ok) throw new Error(`SOLO_VERCEL_PREVIEW_HTTP_${response.status}`);
console.log("COMUN_PREVIEW_GREEN");
