import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

const locationKey = randomBytes(32).toString("base64url");
const spatialKey = randomBytes(32).toString("base64url");

const command = process.platform === "win32" ? "npm.cmd" : "npm";
const child = spawn(command, ["run", "dev", "--", "-p", "3137"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    COMUN_RELATA_PREVIEW: "enabled",
    ALLOW_LOCAL_TESTS: "true",
    COMUN_RELATA_LOCAL_PERSISTENCE: "enabled",
    COMUN_RELATA_LOCAL_EVIDENCE: "enabled",
    COMUN_RELATA_LOCAL_PUBLIC_MAP: "enabled",
    COMUN_QUICK_CAPTURE_V2: "enabled",
    COMUN_PUBLIC_EDUCATION_SENSITIVE_ROUTING_ENABLED: "enabled",
    COMUN_FORWARDING_LOCAL: "enabled",
    COMUN_FISCALIZA_ASSISTED_OPENING_LOCAL: "enabled",
    COMUN_PARTICIPATION_WALLET_LOCAL: "enabled",
    COMUN_SIDEWALK_OPERATIONAL_V2: "enabled",
    COMUN_SIDEWALK_RELATA_FORWARDING_LOCAL: "enabled",
    COMUN_BUS_LOCAL_PILOT: "enabled",
    COMUN_RELATA_LOCATION_ENCRYPTION_KEY: locationKey,
    COMUN_RELATA_SPATIAL_HMAC_KEY: spatialKey,
    COMUN_BASE_URL: "http://127.0.0.1:3137",
  },
});

const stop = (signal) => {
  if (!child.killed) child.kill(signal);
};
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
child.on("exit", (code, signal) => {
  process.exit(signal ? 1 : (code ?? 1));
});
