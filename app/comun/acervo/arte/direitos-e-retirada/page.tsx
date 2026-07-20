import { ComunShell,Section } from "@/components/comun-shell";
import { RightsForm } from "@/app/comun/acervo/direitos-e-remocao/rights-form";
export default function ArtRights(){return <ComunShell><Section><div className="mx-auto max-w-2xl bg-comun-paper p-6 text-comun-black"><h1 className="text-4xl font-black uppercase">Crédito, direitos e retirada</h1><p className="my-5">Você pode corrigir crédito, reivindicar autoria, contestar uso ou pedir retirada. Pedidos são privados e não alteram a publicação automaticamente.</p><RightsForm/></div></Section></ComunShell>}
