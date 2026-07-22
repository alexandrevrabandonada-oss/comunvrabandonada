import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
const forbiddenFiles = /(^|\/)(\.env(?:\.|$)|storageState|playwright-report|test-results|node_modules|\.next)(\/|$)|\.(pem|key|dump|backup|bak)$/i;
const forbiddenContent = /(-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:service[_-]?role|secret[_-]?key)\s*[:=]\s*["'][A-Za-z0-9_\-]{24,}["'])/i;
const violations = [];
for (const file of files) {
  const normalized = file.replaceAll("\\", "/");
  if (forbiddenFiles.test(normalized)) violations.push(`forbidden-file:${normalized}`);
  if (!/\.(?:md|mjs|js|ts|tsx|json|ya?ml|sql|txt)$/i.test(file)) continue;
  const content = readFileSync(file, "utf8");
  if (forbiddenContent.test(content)) violations.push(`sensitive-pattern:${normalized}`);
  for (const match of content.matchAll(/postgres(?:ql)?:\/\/[^\s<]+:[^\s<]+@([^/:\s]+)/gi)) {
    if (!/^(?:127\.0\.0\.1|localhost|host\.docker\.internal)$/i.test(match[1])) violations.push(`remote-credential-url:${normalized}`);
  }
  if (/uses:\s*actions\/upload-artifact@/i.test(content) && /(?:backup|dump|\.sql|cipher)/i.test(content) && !/PR23_SANITIZED_ARTIFACT_ONLY/i.test(content)) violations.push(`backup-artifact-risk:${normalized}`);
}
if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log("PR23_REPOSITORY_AUDIT_OK");
