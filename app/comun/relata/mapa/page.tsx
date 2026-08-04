import { notFound } from "next/navigation";
import { isComunRelataPublicMapEnabled } from "@/lib/comun-relata-evidence-feature";
import { ComunRelataLocalMap } from "@/components/comun-relata-local-map";

export const metadata = { robots: { index: false, follow: false } };

export default function RelataLocalMapPage() {
  if (!isComunRelataPublicMapEnabled()) notFound();
  return <ComunRelataLocalMap />;
}

