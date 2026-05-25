import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env-loader.mjs";

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function fail(message) {
  console.error(`[fail] ${message}`);
  process.exit(1);
}

loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (argValue("--email") || process.env.COMUN_BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();

if (!supabaseUrl) fail("NEXT_PUBLIC_SUPABASE_URL ausente.");
if (!serviceRoleKey) fail("SUPABASE_SERVICE_ROLE_KEY ausente. O bootstrap exige service role e deve rodar somente em ambiente administrativo.");
if (!email) fail("Informe COMUN_BOOTSTRAP_ADMIN_EMAIL ou rode: npm run bootstrap:admin -- --email email@exemplo.com");

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const { data, error } = await supabase.auth.admin.listUsers();
if (error) fail(`falha ao listar usuarios Auth: ${error.message}`);

const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
if (!user) {
  fail(`usuario Auth nao encontrado para ${email}. Crie o usuario em Supabase Auth primeiro e rode o bootstrap novamente.`);
}

const { error: upsertError } = await supabase.from("comun_admin_users").upsert(
  {
    user_id: user.id,
    email,
    role: "admin",
    is_active: true,
  },
  { onConflict: "user_id" },
);

if (upsertError) fail(`falha ao cadastrar admin: ${upsertError.message}`);

console.log(`[ok] admin ativo cadastrado para ${email}`);
