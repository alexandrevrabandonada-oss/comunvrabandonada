import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLearningEnabled } from "@/lib/learning/core";
export const metadata: Metadata = {
  title: "Escola COMUN",
  description:
    "Micro-missões de investigação, organização e estratégia com prática nas pautas.",
};
export const dynamic = "force-dynamic";
export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isLearningEnabled()) notFound();
  return children;
}
