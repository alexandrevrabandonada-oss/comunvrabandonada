import { rm, readFile } from "node:fs/promises";
import { localServiceClient } from "../fixtures/comun/local-fixtures.mjs";
process.env.ALLOW_LOCAL_TESTS = "true";
process.env.COMUN_BASE_URL = "http://127.0.0.1:3017";
export default async function teardown() {
  const db = localServiceClient();
  try {
    const accounts = JSON.parse(
      await readFile(".local/comun-community/auth.json", "utf8"),
    );
    for (const { userId } of accounts) {
      await db.from("comun_member_inbox").delete().eq("member_user_id", userId);
      await db.from("comun_community_audit_log").delete().eq("member_user_id", userId);
      await db.from("comun_community_memberships").delete().eq("member_user_id", userId);
      await db.from("comun_member_profiles").delete().eq("user_id", userId);
      await db.auth.admin.deleteUser(userId);
    }
  } finally {
    await rm(".local/comun-community", { recursive: true, force: true });
  }
  console.log("COMMUNITY_PERSISTENT_FIXTURE_CLEAN");
}
