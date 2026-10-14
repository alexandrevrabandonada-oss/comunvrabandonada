import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const here = fileURLToPath(new URL(".", import.meta.url));
const project = resolve(here, "../../..");
if (process.env.COMUN_SOC_D08_FIXTURE !== "LOCAL_SYNTHETIC_ONLY")
  throw new Error("LOCAL_FIXTURE_SCOPE_REQUIRED");
for (const name of [
  "SUPABASE_DB_URL",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
]) {
  if (process.env[name])
    throw new Error("FIXTURE_REJECTS_EXTERNAL_CREDENTIALS");
}
const config = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  experimental: { externalDir: true },
  webpack(config, { webpack }) {
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^@\/lib\/supabase\/server$/,
        resolve(here, "transport.ts"),
      ),
      new webpack.NormalModuleReplacementPlugin(
        /^@\/lib\/server\/comun-solidarity-organization-governance$/,
        resolve(here, "projection.ts"),
      ),
    );
    config.resolve.alias = {
      "@/lib/supabase/server$": resolve(here, "transport.ts"),
      "@/lib/server/comun-solidarity-organization-governance$": resolve(
        here,
        "projection.ts",
      ),
      "@": project,
      ...config.resolve.alias,
    };
    return config;
  },
};
export default config;
