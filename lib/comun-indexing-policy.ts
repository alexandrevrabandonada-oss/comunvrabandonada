export const COMUN_CANONICAL_ORIGIN = "https://comunsocial.online";

// Preparation remains separate from the terminal launch_publicly decision.
export const COMUN_INDEXING_POLICY = "pilot_noindex" as const;
export const COMUN_PILOT_ROBOTS_HEADER = "noindex, noarchive";
export const COMUN_PRIVATE_CRAWL_PATHS = [
  "/api/",
  "/comun/admin/",
  "/comun/preview/",
  "/comun/conta",
  "/comun/caixa-de-entrada",
  "/comun/minha-participacao",
  "/comun/entrar",
  "/comun/recuperar-acesso",
  "/comun/redefinir-acesso",
] as const;
