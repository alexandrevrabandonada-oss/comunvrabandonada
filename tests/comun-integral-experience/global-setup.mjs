import { mkdir, writeFile } from "node:fs/promises";
import { assertLocalEnvironment } from "../../scripts/local-environment.mjs";
import { cleanupLocalComunFixtures, createLocalAuthFixtures, localPersonaEmails, localServiceClient } from "../fixtures/comun/local-fixtures.mjs";

export default async function setupIntegralExperience() {
  process.env.ALLOW_LOCAL_TESTS = "true";
  process.env.COMUN_BASE_URL ??= "http://127.0.0.1:3000";
  assertLocalEnvironment();
  await cleanupLocalComunFixtures();
  const users = await createLocalAuthFixtures();
  const update = await localServiceClient().from("comun_member_profiles").update({ onboarding_completed_at: null }).eq("user_id", users.participant);
  if (update.error) throw update.error;
  await mkdir(".local/comun-integral", { recursive: true });
  await writeFile(".local/comun-integral/current.json", JSON.stringify({ participant: { email: localPersonaEmails.participant, userId: users.participant } }, null, 2));
}
