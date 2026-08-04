import assert from "node:assert/strict";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.COMUN_BASE_URL;
if (!baseUrl || !/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(baseUrl)) {
  throw new Error("COMUN_BUS_LOCAL_ONLY_URL_REQUIRED");
}

const paths = [
  "/comun/onibus",
  "/api/comun/onibus/lines",
  "/api/comun/onibus/stops",
  "/api/comun/onibus/observatory",
  "/api/comun/onibus/channels/stmu-preview",
  "/api/comun/onibus/waiting-sessions",
];

for (const pathname of paths) {
  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    const response = await fetch(new URL(pathname, baseUrl), {
      method,
      headers: method === "POST" ? { "content-type": "application/json" } : undefined,
      body: method === "POST" ? "{}" : undefined,
    });
    assert.equal(response.status, 404, `${method} ${pathname} must stay cloaked`);
    const text = await response.text();
    assert.equal(/supabase\.co|vercel\.app|signedUrl|fixture-v1|FIX-01/i.test(text), false);
  }
}

console.log(JSON.stringify({ result: "COMUN_BUS_48_0E_DORMANT_NO_LEAK_GREEN", routes: paths.length, methods: "cloaked" }));
