import { permanentRedirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = new URLSearchParams(await searchParams);
  permanentRedirect(`/comun/buscar${params.size ? `?${params}` : ""}`);
}
