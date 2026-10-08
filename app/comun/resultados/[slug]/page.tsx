import { notFound } from "next/navigation";
import { getPublicResult, resultMetadata } from "@/lib/comun-public-sharing";
import { ComunResultDetail as ResultDetail } from "@/components/comun-result-detail";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return resultMetadata((await params).slug);
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const result = await getPublicResult((await params).slug);
  if (!result) notFound();
  return <ResultDetail result={result} />;
}
