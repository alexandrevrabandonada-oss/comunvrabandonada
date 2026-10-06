import { readPilotHumanReadiness } from "./comun-pilot-human-readiness-contract.mjs";

if (
  process.env.VERCEL ||
  process.env.SUPABASE_PROJECT_ID ||
  process.env.R2_ENDPOINT
) {
  throw new Error("Ambiente remoto bloqueado");
}
console.log(
  (await readPilotHumanReadiness())
    ? "NO_GO_REMOTE_REVIEW"
    : "NO_GO_HUMAN_READINESS",
);
console.log("NO_AUTOMATIC_PROMOTION");
