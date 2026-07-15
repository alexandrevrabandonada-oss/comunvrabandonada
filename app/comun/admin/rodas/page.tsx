import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireComunAdmin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export default async function RodasAdminPage() {
  const session = await requireComunAdmin(); const supabase = createServiceSupabaseClient();
  const { data } = supabase ? await supabase.from("comun_construction_circles" as never).select("id, title, status, participation_mode, updated_at, pauta:comun_pauta_spaces(title, slug)" as never).order("updated_at" as never, { ascending: false }) : { data: [] };
  const circles = (data ?? []) as any[];
  return <AdminShell adminEmail={session.admin.email}><p className="text-xs font-black uppercase text-comun-asphalt/60">Curadoria</p><h1 className="mt-2 text-3xl font-black uppercase">Rodas de construção</h1><p className="mt-2 text-comun-asphalt/70">Abertura de rodada, moderação, síntese e decisões ficam sob curadoria. Contribuições pendentes nunca se tornam públicas automaticamente.</p><div className="mt-7 grid gap-4">{circles.map((circle) => <article key={circle.id} className="border-2 border-comun-black bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-black">{circle.title}</h2><p className="text-sm">{circle.pauta?.title || "Pauta"} · {circle.status} · {circle.participation_mode}</p></div><Link href={`/comun/admin/rodas/${circle.id}`} className="border-2 border-comun-black bg-comun-yellow px-3 py-2 text-sm font-black uppercase">Facilitar</Link></div></article>)}{!circles.length && <p className="border-2 border-comun-black p-5">Ainda não há rodas cadastradas no banco local.</p>}</div></AdminShell>;
}
