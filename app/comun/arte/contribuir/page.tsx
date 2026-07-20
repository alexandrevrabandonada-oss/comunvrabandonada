import { permanentArtworkRedirect } from "@/lib/archive/artwork-routes";
export default async function LegacyContribution({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){permanentArtworkRedirect("/comun/acervo/arte/contribuir",await searchParams)}
