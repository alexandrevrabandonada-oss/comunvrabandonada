import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { CommunityLoginForm } from "@/components/community-auth-form";
import { safeCommunityReturn } from "@/lib/community-return";

export default async function Entrar({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const params = await searchParams;
  const returnTo = safeCommunityReturn(params.returnTo);
  return <ComunShell><Section><div className="grid gap-8 lg:grid-cols-[minmax(0,32rem)_1fr]"><div><p className="text-sm font-black uppercase text-comun-yellow">Acesso pedido no momento necessário</p><h1 className="mt-3 text-4xl font-black uppercase leading-none text-comun-paper">Entrar no COMUN</h1><p className="mt-4 max-w-xl text-comun-paper/75">Depois de entrar, você volta para a ação que escolheu. Explorar o COMUN continua livre.</p><div className="mt-6 bg-comun-paper p-5 text-comun-black"><CommunityLoginForm returnTo={returnTo}/><p className="mt-4 text-sm">Ainda não tem conta? <Link className="font-bold underline" href={`/comun/criar-conta?returnTo=${encodeURIComponent(returnTo)}`}>Criar conta</Link></p></div></div><aside className="border-l-4 border-comun-yellow p-5"><p className="text-xs font-black uppercase text-comun-yellow">Depois do acesso</p><h2 className="mt-2 text-2xl font-black uppercase">Você retorna ao mesmo contexto</h2><p className="mt-3 break-words text-comun-paper/75">Destino protegido: {returnTo}</p><Link href={returnTo} className="mt-5 inline-block font-black uppercase text-comun-yellow underline">Continuar explorando sem entrar</Link></aside></div></Section></ComunShell>;
}
