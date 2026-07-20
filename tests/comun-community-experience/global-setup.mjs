import { mkdir, writeFile } from "node:fs/promises";
import { localServiceClient } from "../fixtures/comun/local-fixtures.mjs";
process.env.ALLOW_LOCAL_TESTS = "true";
process.env.COMUN_BASE_URL = "http://127.0.0.1:3017";
const email = "s36-1-community@comun.test",
  password = "comun-s36-1-local-only";
export default async function setup() {
  const db = localServiceClient(),
    { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    old = list?.users.find((x) => x.email === email);
  if (old) await db.auth.admin.deleteUser(old.id);
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { fixture: "s36-1" },
  });
  if (error) throw error;
  await db.from("comun_member_profiles").upsert({
    user_id: data.user.id,
    display_name: "Pessoa Comunidade Fixture",
    onboarding_completed_at: new Date().toISOString(),
  });
  await mkdir(".local/comun-community", { recursive: true });
  await writeFile(
    ".local/comun-community/auth.json",
    JSON.stringify({ email, password, userId: data.user.id }),
  );
  console.log("COMMUNITY_PERSISTENT_FIXTURE_READY");
}
