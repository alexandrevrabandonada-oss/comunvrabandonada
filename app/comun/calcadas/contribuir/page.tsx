import { notFound } from "next/navigation";
import { SidewalkRelataIntakeForm } from "./sidewalk-relata-intake-form";
import { isComunSidewalkRelataEnabled } from "@/lib/comun-sidewalk-p4-feature";

export const dynamic = "force-dynamic";

export default function Page() {
  if (!isComunSidewalkRelataEnabled()) notFound();
  return <SidewalkRelataIntakeForm />;
}
