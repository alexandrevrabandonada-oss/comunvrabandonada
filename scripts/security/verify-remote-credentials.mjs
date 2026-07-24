import { spawnSync } from "node:child_process";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.SUPABASE_DB_URL;
if (!url || !publicKey || !serviceKey || !dbUrl) process.exit(1);

const request = async (path, key) => fetch(`${url}${path}`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});

const publicAuth = await request("/auth/v1/settings", publicKey);
if (!publicAuth.ok) process.exit(1);
console.log("AUTH_PUBLIC_OK");

const serviceAuth = await request("/auth/v1/admin/users?page=1&per_page=1", serviceKey);
if (!serviceAuth.ok) process.exit(1);
console.log("AUTH_SERVICE_OK");

const database = spawnSync("psql", [dbUrl, "--no-psqlrc", "--tuples-only", "--quiet", "-c", "select 1"], {
  encoding: "utf8",
});
if (database.status !== 0) process.exit(1);
console.log("DATABASE_OK");

const storage = await request("/storage/v1/bucket", serviceKey);
if (!storage.ok) process.exit(1);
console.log("STORAGE_OK");
console.log("CREDENTIAL_ROTATION_VERIFIED");

