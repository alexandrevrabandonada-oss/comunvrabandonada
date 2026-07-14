import { PRODUCTION_CHECKS_DISABLED_MESSAGE } from "./production-guard.mjs";

if (process.env.ALLOW_PRODUCTION_CHECKS !== "1") {
  console.error(`[fail] ${PRODUCTION_CHECKS_DISABLED_MESSAGE}`);
  process.exit(1);
}
