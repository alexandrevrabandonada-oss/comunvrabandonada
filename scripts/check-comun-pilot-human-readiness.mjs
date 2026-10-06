import { readPilotHumanReadiness } from "./comun-pilot-human-readiness-contract.mjs";

console.log(
  (await readPilotHumanReadiness())
    ? "COMUN_PILOT_HUMAN_READINESS_CONFIRMED"
    : "COMUN_PILOT_HUMAN_READINESS_INCOMPLETE",
);
