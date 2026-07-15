import Link from "next/link";
import { redirect } from "next/navigation";
import { ComunShell, Section } from "@/components/comun-shell";
import { listMyParticipation } from "@/lib/pauta-miniapps";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MinhaParticipacaoPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) redirect("/comun/entrar?returnTo=%2Fcomun%2Fminha-participacao");
  const participation = await listMyParticipation(user.id);
  return <ComunShell><Section><p className="text-xs font-black uppercase text-comun-yellow">Área autenticada</p><h1 className="mt-2 text-3xl font-black uppercase text-comun-paper">Minha participação</h1><p className="mt-3 max-w-2xl text-comun-paper/75">Veja os vínculos e o estado das suas contribuições. Dados privados, contato e observações de moderação não aparecem aqui.</p><section className="mt-8 grid gap-5 lg:grid-cols-2"><div className="border-2 border-comun-yellow bg-comun-black p-5 text-comun-paper"><h2 className="text-xl font-black uppercase text-comun-yellow">Pautas</h2>{participation.memberships.length ? <ul className="mt-4 space-y-3">{participation.memberships.map((membership: any) => <li key={membership.id} className="border-b border-comun-paper/20 pb-3"><p className="font-bold">{membership.pauta?.title || "Pauta"}</p><p className="text-sm">{membership.role} · {membership.status}</p>{membership.pauta?.slug && <Link className="text-sm font-bold text-comun-yellow underline" href={`/comun/pautas/${membership.pauta.slug}`}>Abrir pauta</Link>}</li>)}</ul> : <p className="mt-4">Ainda não há vínculo ativo.</p>}</div><div className="border-2 border-comun-yellow bg-comun-black p-5 text-comun-paper"><h2 className="text-xl font-black uppercase text-comun-yellow">Contribuições</h2>{participation.contributions.length ? <ul className="mt-4 space-y-3">{participation.contributions.map((contribution: any) => <li key={contribution.id} className="border-b border-comun-paper/20 pb-3"><p className="font-bold">{contribution.circle?.title || "Roda"}</p><p className="text-sm">{contribution.contribution_type} · {contribution.status}</p><p className="text-xs text-comun-paper/70">Protocolo: {contribution.public_protocol || "em processamento"}</p></li>)}</ul> : <p className="mt-4">Nenhuma contribuição vinculada à sua conta.</p>}</div></section></Section></ComunShell>;
}
