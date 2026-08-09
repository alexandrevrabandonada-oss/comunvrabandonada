import { spawn } from "node:child_process";
import { createServer } from "node:http";

const appPort = 3144;
const authPort = 55498;
const loopback = "127.0.0.1";
const fakeAuthOrigin = `http://${loopback}:${authPort}`;

const authServer = createServer((request, response) => {
  const url = new URL(request.url ?? "/", fakeAuthOrigin);
  if (url.pathname === "/auth/v1/authorize") {
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(
      "<!doctype html><html lang=\"pt-BR\"><title>OAuth local interrompido</title><body><main><h1>OAuth local interrompido antes do Google</h1><p>Nenhuma solicitação externa foi feita.</p></main></body></html>",
    );
    return;
  }
  if (url.pathname === "/auth/v1/token") {
    response.writeHead(400, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify({ error: "invalid_grant" }));
    return;
  }
  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

await new Promise((resolve, reject) => {
  authServer.once("error", reject);
  authServer.listen(authPort, loopback, resolve);
});

const next = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "dev", "--", "-p", String(appPort)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      COMUN_GOOGLE_AUTH_ENABLED: "enabled",
      NEXT_PUBLIC_SITE_URL: `http://${loopback}:${appPort}`,
      NEXT_PUBLIC_SUPABASE_URL: fakeAuthOrigin,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "p1g-local-public-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "p1g-local-service-key",
      VERCEL_ENV: "development",
    },
    shell: process.platform === "win32",
    stdio: "inherit",
  },
);

let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  authServer.close();
  if (next.exitCode === null) next.kill(signal);
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
next.on("exit", (code) => {
  authServer.close(() => process.exit(code ?? 0));
});
