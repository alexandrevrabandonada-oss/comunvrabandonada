import { notFound } from "next/navigation";
import { isComunRelataPersistenceEnabled } from "@/lib/comun-relata-persistence";
import { isComunRelataAttachmentsEnabled, isComunRelataLocationEnabled } from "@/lib/comun-relata-evidence-feature";
import { RelataPreview } from "./relata-preview";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function RelataPage() {
  if (!isComunRelataPersistenceEnabled()) notFound();
  return <RelataPreview attachmentsEnabled={isComunRelataAttachmentsEnabled()} locationEnabled={isComunRelataLocationEnabled()} />;
}
