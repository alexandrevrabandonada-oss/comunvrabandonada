import { ComunShell,Section } from "@/components/comun-shell";
import { ArtworkContributionForm } from "./contribution-form";
import { isComunCulturalProgressiveRightsEnabled } from "@/lib/comun-cultural-progressive-rights";
export default function ContributeArt(){return <ComunShell><Section><div className="mx-auto max-w-3xl bg-comun-paper p-5 text-comun-black sm:p-8"><p className="text-xs font-black uppercase">Contribuição moderada</p><h1 className="mt-2 text-4xl font-black uppercase">Compartilhe arte e contexto</h1><p className="my-6">O original permanece privado. Direitos, crédito e território serão revisados antes de qualquer publicação.</p><ArtworkContributionForm progressiveRightsEnabled={isComunCulturalProgressiveRightsEnabled()}/></div></Section></ComunShell>}
