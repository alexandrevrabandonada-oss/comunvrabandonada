import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { assertVersionedBaseline } from "../db/verify-canonical-baseline.mjs";

const FILES = [
  "comun-remote-schema-detailed.json",
  "comun-remote-schema-baseline-candidate.json",
  "comun-security-hardening-preflight.json",
];

export function validateCaptureArtifact(name, source) {
  if (!FILES.includes(name))
    throw new Error("CANONICAL_CAPTURE_FILE_NOT_ALLOWED");
  if (/postgres(?:ql)?:\/\/[^\s"']+@|sb_secret_[A-Za-z0-9_-]+/i.test(source)) {
    throw new Error("CANONICAL_CAPTURE_SECRET_SHAPED_VALUE");
  }
  let document;
  try {
    document = JSON.parse(source);
  } catch {
    throw new Error("CANONICAL_CAPTURE_JSON_INVALID");
  }
  assertVersionedBaseline(document);
  if (name === "comun-security-hardening-preflight.json") {
    if (document.scope !== "COMUN_CANONICAL_SECURITY_HARDENING_PREFLIGHT") {
      throw new Error("CANONICAL_CAPTURE_SCOPE_INVALID");
    }
  } else if (
    document.scope !== "APP_CANONICAL_SECURITY_BASELINE" ||
    !Array.isArray(document.canonical?.relations) ||
    !Array.isArray(document.security?.blockingFindings)
  ) {
    throw new Error("CANONICAL_CAPTURE_SCOPE_INVALID");
  }
  return document;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.length !== 2 + FILES.length) {
    throw new Error("CANONICAL_CAPTURE_FILES_REQUIRED");
  }
  for (let index = 0; index < FILES.length; index += 1) {
    const path = process.argv[index + 2];
    if (!path.endsWith(FILES[index])) {
      throw new Error("CANONICAL_CAPTURE_FILE_NOT_ALLOWED");
    }
    validateCaptureArtifact(FILES[index], readFileSync(path, "utf8"));
  }
  console.log("COMUN_CANONICAL_CAPTURE_SANITIZED");
}
