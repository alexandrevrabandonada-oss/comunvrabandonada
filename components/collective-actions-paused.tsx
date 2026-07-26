import { ComunShell, Section } from "@/components/comun-shell";
import { COLLECTIVE_ACTIONS_PAUSED_MESSAGE } from "@/lib/collective-actions-release-contract";

export function CollectiveActionsPaused() {
  return <ComunShell><Section><h1 className="text-4xl font-black uppercase text-comun-yellow">Ações coletivas</h1><p role="status" className="mt-5 max-w-3xl border-l-4 border-comun-yellow bg-comun-paper/5 p-5 text-lg">{COLLECTIVE_ACTIONS_PAUSED_MESSAGE}</p></Section></ComunShell>;
}
