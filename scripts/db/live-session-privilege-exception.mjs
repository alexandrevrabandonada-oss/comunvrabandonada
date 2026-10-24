import { createHash } from "node:crypto";

// Human authorization: only current_session_active(), 24/10/2026.
// Pin the entire reviewed SQL contract, not just a filename or function name.
// Any change to body, arguments, policies or grants requires renewed review.
const reviewedFile = "20261024174838_comun_legacy_private_live_session.sql";
const reviewedDigest =
  "62b768e5d36ee99910c0718977fc639b77a42dfcbe913b21248615375c6a73fd";

export function permitsReviewedLiveSessionHelper(file, sql, config) {
  if (file !== reviewedFile) return false;
  const executable = sql.replace(/\r\n/g, "\n").trim();
  if (createHash("sha256").update(executable).digest("hex") !== reviewedDigest)
    return false;
  // A private helper is not an exposed RPC. Fail closed on missing/ambiguous API config.
  const apiSections = config.split(/^\[api\]\s*$/m);
  if (apiSections.length !== 2) return false;
  const api = apiSections[1].split(/^\[/m)[0];
  const schemaLists = api?.match(/^schemas\s*=\s*\[[^\]\r\n]*\]\s*$/gm);
  if (schemaLists?.length !== 1) return false;
  try {
    const schemas = JSON.parse(
      schemaLists[0].slice(schemaLists[0].indexOf("=") + 1),
    );
    return (
      schemas.length > 0 &&
      schemas.every(
        (schema) =>
          typeof schema === "string" && schema !== "comun_auth_private",
      )
    );
  } catch {
    return false;
  }
}
