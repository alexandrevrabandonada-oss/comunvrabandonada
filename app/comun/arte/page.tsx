import { permanentArtworkRedirect } from "@/lib/archive/artwork-routes";
export default async function LegacyArt({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){permanentArtworkRedirect("/comun/acervo/arte",await searchParams)}
