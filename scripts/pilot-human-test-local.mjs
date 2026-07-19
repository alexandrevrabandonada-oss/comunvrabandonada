import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { assertLocalEnvironment } from "./local-environment.mjs";
import {
  cleanupLocalComunFixtures,
  createLocalAuthFixtures,
  createLocalPautaMiniappFixture,
} from "../tests/fixtures/comun/local-fixtures.mjs";

assertLocalEnvironment();
const port = Number(process.env.PILOT_HUMAN_TEST_PORT || "3037");
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Porta local inválida.");
const baseUrl = `http://localhost:${port}`;
process.env.COMUN_BASE_URL = baseUrl;
process.env.NEXT_PUBLIC_SITE_URL = baseUrl;
if (process.env.MEDIA_STORAGE_PROVIDER !== "supabase-local") throw new Error("Storage local obrigatório.");
if (!existsSync(".next/BUILD_ID")) throw new Error("Build ausente. Execute npm run build antes da sessão.");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(supabaseUrl)) throw new Error("Supabase local inválido.");
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRole) throw new Error("Credencial local do Supabase ausente.");

const db = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
const { data: buckets, error: storageError } = await db.storage.listBuckets();
if (storageError) throw storageError;
for (const bucket of ["archive-private-originals", "archive-public-derivatives"]) {
  if (!buckets?.some((item) => item.id === bucket)) throw new Error(`Bucket local ausente: ${bucket}`);
}

const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
await cleanupLocalComunFixtures();
const users = await createLocalAuthFixtures();
const pauta = await createLocalPautaMiniappFixture(users);

console.log("COMUN_GATE_HUMANO_LOCAL_READY");
console.log(`URL=${baseUrl}/comun`);
console.log(`BRANCH=${branch}`);
console.log(`COMMIT=${commit}`);
console.log(`FIXTURE_PAUTA=${pauta.slug}`);
console.log("TELEMETRIA=DESATIVADA");
console.log("DESTINOS_REMOTOS=BLOQUEADOS");
console.log("Para encerrar o servidor: Ctrl+C");
console.log("Para limpar fixtures depois das sessões: npm run test:fixtures:cleanup");

if (process.env.PILOT_HUMAN_TEST_CHECK_ONLY === "true") process.exit(0);

const child = spawn("npm", ["run", "start", "--", "--port", String(port)], {
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32",
});
const stop = (signal) => child.kill(signal);
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
child.on("exit", (code) => process.exit(code ?? 0));
