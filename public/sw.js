const VERSION = "comun-pwa-v4";
const SHELL_CACHE = `${VERSION}-shell`;
const PUBLIC_CACHE = `${VERSION}-public`;
const SHELL = [
  "/comun/offline",
  "/manifest.webmanifest",
  "/icons/comun-192.png",
  "/icons/comun-512.png",
  "/icons/comun-maskable-512.png",
];
const PUBLIC_PREFIXES = [
  "/comun/territorios",
  "/comun/comunidades",
  "/comun/c/",
  "/comun/pautas",
  "/comun/resultados",
  "/comun/acoes",
  "/comun/dossies",
  "/comun/radio",
  "/comun/arte",
  "/comun/acervo",
  "/comun/observatorios",
  "/comun/seguranca",
  "/comun/ajuda",
];
const PRIVATE_PREFIXES = [
  "/comun/admin",
  "/comun/minha-participacao",
  "/comun/caixa-de-entrada",
  "/comun/conta",
  "/comun/entrar",
  "/comun/criar-conta",
  "/comun/onboarding",
  "/comun/mapa/contribuir",
  "/api/",
];

// A prefix must end at a path segment boundary. In particular,
// /comun/acoes-interno is not /comun/acoes, and a community's private
// management routes must never be considered public offline pages.
function matchesPathPrefix(pathname, prefix) {
  const base = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  return pathname === base || pathname.startsWith(`${base}/`);
}

function isAllowedCommunityPage(pathname) {
  return (
    !pathname.startsWith("/comun/c/") ||
    /^\\/comun\\/c\\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\\/agenda)?\\/?$/.test(pathname)
  );
}

function isPublicPage(url) {
  return (
    url.origin === self.location.origin &&
    url.pathname.startsWith("/comun/") &&
    !url.search &&
    !url.hash &&
    !PRIVATE_PREFIXES.some((prefix) => matchesPathPrefix(url.pathname, prefix)) &&
    isAllowedCommunityPage(url.pathname) &&
    PUBLIC_PREFIXES.some((prefix) => matchesPathPrefix(url.pathname, prefix))
  );
}

function canStore(response) {
  const cacheControl =
    response.headers.get("cache-control")?.toLowerCase() ?? "";
  return (
    response.ok &&
    response.type === "basic" &&
    !response.headers.has("set-cookie") &&
    !cacheControl.includes("private") &&
    !cacheControl.includes("no-store")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) =>
                  key.startsWith("comun-pwa-") &&
                  ![SHELL_CACHE, PUBLIC_CACHE].includes(key),
              )
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (
    event.data?.type === "CLEAR_PRIVATE" ||
    event.data?.type === "CLEAR_CONTENT_CACHES"
  ) {
    event.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) => key.startsWith("comun-pwa-") && key !== SHELL_CACHE,
              )
              .map((key) => caches.delete(key)),
          ),
        ),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (PRIVATE_PREFIXES.some((prefix) => matchesPathPrefix(url.pathname, prefix)))
    return;
  if (request.mode === "navigate" && isPublicPage(url)) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (canStore(response))
            (await caches.open(PUBLIC_CACHE)).put(request, response.clone());
          return response;
        })
        .catch(
          async () =>
            (await caches.match(request)) ||
            (await caches.match("/comun/offline")),
        ),
    );
    return;
  }
  if (request.mode === "navigate" && url.pathname.startsWith("/comun")) {
    event.respondWith(
      fetch(request).catch(() => caches.match("/comun/offline")),
    );
    return;
  }
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/"))
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then(async (response) => {
            if (canStore(response))
              (await caches.open(SHELL_CACHE)).put(request, response.clone());
            return response;
          }),
      ),
    );
  }
});
