import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env-loader.mjs";
loadLocalEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase server-only não configurado.");
const db = createClient(url, key, { auth: { persistSession: false } });
const tables = {
  comun_archive_items: "*",
  comun_archive_collections: "*",
  comun_archive_collection_items: "*",
  comun_archive_relations: "*",
  comun_archive_assets: "*",
  comun_archive_submissions:
    "id, submission_type, archive_item_id, status, contributor_credit_preference, relationship_to_material, title_suggestion, description_suggestion, city, neighborhood, place_name, approximate_date, source_name, source_story, photographer_name, rights_declaration, permission_confirmed, public_credit, risk_level, created_at, updated_at, reviewed_at",
  comun_archive_submission_assets: "*",
  comun_archive_item_suggestions:
    "id, archive_item_id, suggestion_type, suggestion_text, contributor_alias, source_reference, status, risk_level, created_at, reviewed_at",
};
const manifest = {
  exported_at: new Date().toISOString(),
  schema_version: 2,
  storage: {
    provider: "r2",
    originals_bucket: process.env.R2_BUCKET_ORIGINALS ?? null,
    public_bucket: process.env.R2_BUCKET_PUBLIC ?? null,
  },
  privacy: { private_contacts_excluded: true },
  data: {},
};
for (const [table, fields] of Object.entries(tables)) {
  const { data, error } = await db.from(table).select(fields);
  if (error) throw new Error(`${table}: ${error.message}`);
  manifest.data[table] = data;
}
const day = new Date().toISOString().slice(0, 10),
  dir = path.join(process.cwd(), "backups", "acervo"),
  file = path.join(dir, `manifest-${day}.json`);
await fs.mkdir(dir, { recursive: true });
await fs.writeFile(file, JSON.stringify(manifest, null, 2));
console.log(`Manifest exportado: ${file}`);
