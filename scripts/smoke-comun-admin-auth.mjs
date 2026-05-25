import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env-loader.mjs";

function logOk(message) {
  console.log(`[ok] ${message}`);
}

function fail(message) {
  console.error(`[fail] ${message}`);
  process.exitCode = 1;
}

function formatError(error) {
  if (!(error instanceof Error)) return "erro desconhecido";
  const causeCode = error.cause?.code;
  return causeCode ? `${error.message} (${causeCode})` : error.message;
}

async function checkHttp(path, expected) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.log(`[skip] NEXT_PUBLIC_SITE_URL ausente; teste HTTP de ${path} deve ser feito manualmente.`);
    return;
  }

  const response = await fetch(new URL(path, siteUrl), { redirect: "manual" });
  if (expected === "public" && response.status < 400) {
    logOk(`${path} acessivel sem login`);
    return;
  }

  if (expected === "redirect-login") {
    const location = response.headers.get("location") ?? "";
    if ([301, 302, 303, 307, 308].includes(response.status) && location.includes("/comun/admin/login")) {
      logOk(`${path} exige autenticacao`);
      return;
    }
  }

  fail(`${path} retornou status inesperado: ${response.status}`);
}

loadLocalEnv();

const requiredVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const missingVars = requiredVars.filter((name) => !process.env[name]);
if (missingVars.length) {
  fail(`faltam variaveis obrigatorias em .env.local: ${missingVars.join(", ")}`);
  process.exit();
}

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

try {
  const adminUsers = await service.from("comun_admin_users").select("id, email, is_active").limit(5);
  if (adminUsers.error) throw new Error(`tabela comun_admin_users indisponivel: ${adminUsers.error.message}`);
  logOk("tabela comun_admin_users existe");

  const auditLog = await service.from("comun_admin_audit_log").select("id").limit(1);
  if (auditLog.error) throw new Error(`tabela comun_admin_audit_log indisponivel: ${auditLog.error.message}`);
  logOk("tabela comun_admin_audit_log existe");

  const activeAdmins = (adminUsers.data ?? []).filter((row) => row.is_active);
  if (activeAdmins.length) {
    logOk("existe pelo menos um admin ativo");
  } else {
    console.log("[manual] nenhum admin ativo encontrado. Crie usuario no Supabase Auth e rode npm run bootstrap:admin -- --email email@exemplo.com");
  }

  await checkHttp("/comun", "public");
  await checkHttp("/comun/relatar", "public");
  await checkHttp("/comun/admin", "redirect-login");
} catch (error) {
  fail(formatError(error));
}
