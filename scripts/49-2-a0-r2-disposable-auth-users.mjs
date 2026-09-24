import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.COMUN_R2_LOCAL_API_URL;
const key = process.env.COMUN_R2_LOCAL_SERVICE_ROLE_KEY;
const output = process.argv[2];
if (
  !url ||
  !key ||
  !output ||
  !/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(url)
) {
  throw new Error("COMUN_R2_DISPOSABLE_AUTH_DESTINATION_REQUIRED");
}

const client = createClient(url, key, { auth: { persistSession: false } });
const users = {};
for (const label of ["a", "b"]) {
  const { data, error } = await client.auth.admin.createUser({
    email: `comun-r2-${label}-${randomUUID()}@example.invalid`,
    password: randomUUID(),
    email_confirm: true,
  });
  if (error || !data.user?.id)
    throw new Error(`COMUN_R2_DISPOSABLE_AUTH_CREATE_FAILED:${label}`);
  users[label] = data.user.id;
}
writeFileSync(output, `${JSON.stringify(users)}\n`, { mode: 0o600 });
console.log("COMUN_R2_DISPOSABLE_AUTH_USERS_CREATED");
