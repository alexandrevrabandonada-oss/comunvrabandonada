import { execFileSync } from "node:child_process";

const npm = "npm";
const commands = [
  "quality:test",
  "quality:pwa",
  "quality:a11y",
  "quality:performance",
  "quality:load",
  "quality:network",
];
for (const command of commands) {
  console.log(`QUALITY_PHASE ${command}`);
  execFileSync(npm, ["run", command], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, COMUN_QUALITY_REHEARSAL: "1" },
  });
}
console.log("COMUN_QUALITY_LOCAL_REHEARSAL_GREEN");
