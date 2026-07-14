"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import {
  getMediaStorage,
  mediaStorageConfiguration,
  publicMediaUrl,
} from "@/lib/media-storage";

export async function runArchiveStorageHealthcheck() {
  const session = await requireComunAdmin({ roles: ["admin"] });
  const configuration = mediaStorageConfiguration();
  if (!configuration.configured) {
    await logComunAdminAction({
      session,
      action: "archive_storage_healthcheck_failed",
      targetType: "storage",
      metadata: {
        reason: "missing_configuration",
        missing: configuration.missing,
      },
    });
    revalidatePath("/comun/admin/acervo/storage");
    return;
  }
  const stamp = `smoke/healthcheck/${Date.now()}-${randomUUID()}.pdf`,
    fixture = new TextEncoder().encode("COMUN R2 healthcheck");
  const storage = getMediaStorage();
  let privateCreated = false,
    publicCreated = false;
  try {
    await storage.putObject({
      scope: "private_original",
      key: stamp,
      contentType: "application/pdf",
      sizeBytes: fixture.byteLength,
      body: fixture,
    });
    privateCreated = true;
    const privateMeta = await storage.getObjectMetadata(
      "private_original",
      stamp,
    );
    if (!privateMeta || privateMeta.contentLength !== fixture.byteLength)
      throw new Error("Metadados do bucket privado invalidos.");
    const signed = await storage.createPrivateReadUrl(stamp, 60);
    const privateRead = await fetch(signed.url, { cache: "no-store" });
    if (!privateRead.ok) throw new Error("Leitura privada temporaria falhou.");
    await storage.putObject({
      scope: "public_safe",
      key: stamp,
      contentType: "application/pdf",
      sizeBytes: fixture.byteLength,
      body: fixture,
    });
    publicCreated = true;
    const publicMeta = await storage.getObjectMetadata("public_safe", stamp);
    if (!publicMeta || publicMeta.contentLength !== fixture.byteLength)
      throw new Error("Metadados do bucket publico invalidos.");
    const publicRead = await fetch(publicMediaUrl(stamp), {
      cache: "no-store",
    });
    if (!publicRead.ok) throw new Error("Leitura publica falhou.");
    await logComunAdminAction({
      session,
      action: "archive_storage_healthcheck_passed",
      targetType: "storage",
      metadata: {
        private_write: true,
        private_read: true,
        public_write: true,
        public_read: true,
        cleanup_planned: true,
      },
    });
  } catch (error) {
    await logComunAdminAction({
      session,
      action: "archive_storage_healthcheck_failed",
      targetType: "storage",
      metadata: {
        reason: error instanceof Error ? error.message : "healthcheck_failed",
      },
    });
  } finally {
    if (publicCreated)
      try {
        await storage.deleteObject("public_safe", stamp);
      } catch {}
    if (privateCreated)
      try {
        await storage.deleteObject("private_original", stamp);
      } catch {}
    revalidatePath("/comun/admin/acervo/storage");
  }
}
