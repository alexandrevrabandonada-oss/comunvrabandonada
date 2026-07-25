import { readFile } from "node:fs/promises";
import { serializeSanitizedSecurityDiagnostic } from "./apply-forward-only.mjs";

const input = process.argv.find((argument) => argument.startsWith("--input="))?.slice(8);
if (!input) throw new Error("SOLO_SECURITY_DIAGNOSTIC_INPUT_REQUIRED");

const diagnostic = JSON.parse(await readFile(input, "utf8"));
serializeSanitizedSecurityDiagnostic(diagnostic);
console.log("COMUN_RELEASE_SECURITY_DIAGNOSTIC_SANITIZED");
