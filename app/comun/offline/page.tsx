"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ComunShell, Section } from "@/components/comun-shell";
import { COMUN_LAST_SAFE_ROUTE_KEY } from "@/lib/comun-pwa";

export default function OfflinePage() {
  const [lastRoute, setLastRoute] = useState("/comun");
  useEffect(() => { queueMicrotask(() => setLastRoute(sessionStorage.getItem(COMUN_LAST_SAFE_ROUTE_KEY) || "/comun")); }, []);
  return <ComunShell><Section><div role="status" className="max-w-3xl border-2 border-comun-yellow bg-comun-paper p-6 text-comun-black">
    <p className="text-xs font-black uppercase">Disponível offline</p><h1 className="mt-2 text-4xl font-black uppercase">Sem conexão agora.</h1>
    <p className="mt-3">Você ainda pode consultar páginas públicas já disponíveis neste aparelho. Protocolos recentes, Minha área e qualquer envio precisam de conexão para confirmação.</p>
    <p className="mt-3 text-sm"><strong>Importante:</strong> fotos não são guardadas ao recarregar. Se você estava contribuindo, selecione a foto novamente quando a conexão voltar.</p>
    <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => window.location.reload()} className="min-h-12 bg-comun-yellow px-4 font-black uppercase">Tentar novamente</button><Link href={lastRoute} className="inline-flex min-h-12 items-center border-2 border-comun-black px-4 font-black uppercase">Voltar à última página segura</Link><Link href="/comun" className="inline-flex min-h-12 items-center font-black underline">Início</Link></div>
  </div></Section></ComunShell>;
}
