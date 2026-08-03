import { notFound } from "next/navigation";
import { isComunRelataEnabled } from "@/lib/comun-relata-feature";
import { RelataPreview } from "./relata-preview";

export default function RelataPage() {
  if (!isComunRelataEnabled()) notFound();
  return <RelataPreview />;
}
