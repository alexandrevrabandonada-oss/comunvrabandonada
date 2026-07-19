import { notFound } from "next/navigation";
import { ComunShell,Section } from "@/components/comun-shell";
import { CommunityParticipationOnboarding } from "@/components/community-participation-onboarding";
import { requireCommunitySession } from "@/lib/community-auth";
import { getCommunity,listIssues } from "@/lib/comun-data";
import { getCommunityExperience } from "@/lib/community-experience";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{slug:string}>}){const{slug}=await params;await requireCommunitySession(`/comun/c/${slug}/participar`);const[community,issues]=await Promise.all([getCommunity(slug),listIssues({communitySlug:slug})]),x=getCommunityExperience(slug);if(!community||!x)notFound();return <ComunShell><Section><p className="text-xs font-black uppercase text-comun-yellow">Acompanhar comunidade</p><h1 className="mt-2 text-4xl font-black uppercase">{community.name}</h1><p className="mt-3 max-w-2xl text-comun-paper/75">Escolha apenas o que fizer sentido agora. Você pode mudar suas preferências ou sair depois.</p><div className="mt-6"><CommunityParticipationOnboarding slug={slug} name={community.name} options={x.collaboration} pautaHref={issues[0]?`/comun/pautas/${issues[0].slug}`:`/comun/c/${slug}`}/></div></Section></ComunShell>}
