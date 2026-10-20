import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const expectedSourceSha256 =
  "63cba5e79fc964485eaa51763ce3daf9b5d7f16311d851fc49525ab212e101a2";

// Configuration identity only. No connection, SQL, credentials or release permit.
export function matchesCanonicalCiSource({ databaseUrl, projectRef } = {}) {
  try {
    if (
      typeof databaseUrl !== "string" ||
      !databaseUrl ||
      typeof projectRef !== "string" ||
      !/^[a-z]{20}$/.test(projectRef)
    )
      return false;
    const url = new URL(databaseUrl);
    if (!new Set(["postgres:", "postgresql:"]).has(url.protocol)) return false;
    // Only known TLS parameters are accepted; libpq identity overrides refuse.
    if (url.hash || url.pathname !== "/postgres") return false;
    const seen = new Set();
    for (const [key, value] of url.searchParams) {
      if (seen.has(key)) return false;
      seen.add(key);
      if (key === "sslmode") {
        if (!["require", "verify-full"].includes(value)) return false;
      } else if (key === "sslrootcert") {
        if (!value || /[\r\n\0]/.test(value)) return false;
      } else return false;
    }
    const hostname = url.hostname.toLowerCase();
    const username = decodeURIComponent(url.username);
    const direct = /^db\.([a-z]{20})\.supabase\.co$/.exec(hostname);
    const pooler = /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(hostname);
    let extractedRef;
    if (direct && username === "postgres") extractedRef = direct[1];
    else if (pooler)
      extractedRef = /^postgres\.([a-z]{20})$/.exec(username)?.[1];
    if (!extractedRef || extractedRef !== projectRef) return false;
    return (
      createHash("sha256")
        .update(JSON.stringify(extractedRef))
        .digest("hex") === expectedSourceSha256
    );
  } catch {
    return false;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const matches = matchesCanonicalCiSource({
    databaseUrl: process.env.SUPABASE_DB_URL,
    projectRef: process.env.SUPABASE_PROJECT_REF,
  });
  console.log(
    matches
      ? "COMUN_CI_SOURCE_IDENTITY_MATCH"
      : "COMUN_CI_SOURCE_IDENTITY_MISMATCH",
  );
  if (!matches) process.exitCode = 1;
}
