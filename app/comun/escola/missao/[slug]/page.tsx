import { notFound } from "next/navigation";
import { School } from "@/components/learning/school";
import { getMission } from "@/lib/learning/core";
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getMission(slug)) notFound();
  return <School view="mission" missionId={slug} />;
}
