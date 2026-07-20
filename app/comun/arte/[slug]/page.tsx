import { permanentArtworkRedirect } from "@/lib/archive/artwork-routes";
export default async function LegacyArtwork({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){const{slug}=await params;permanentArtworkRedirect(`/comun/acervo/arte/${slug}`,await searchParams)}
