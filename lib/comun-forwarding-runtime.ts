import { createComunRelataPersistenceClient } from "./comun-relata-persistence";
import { isComunForwardingEnabled } from "./comun-forwarding-feature";
import { isComunStmuAssistedEnabled } from "./comun-stmu-assisted-feature";
import { isComunEssentialForwardingAssistedEnabled } from "./comun-essential-services-feature";
import { walletSecretHash } from "./comun-participation-wallet-runtime";

export function forwardingDb() {
  if (
    !isComunForwardingEnabled() &&
    !isComunStmuAssistedEnabled() &&
    !isComunEssentialForwardingAssistedEnabled()
  )
    throw new Error("COMUN_FORWARDING_LOCAL_REQUIRED");
  return createComunRelataPersistenceClient();
}

export function walletHash(token: string) {
  return walletSecretHash(token);
}

export function safePackage(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
