import Link from "next/link";
import {redirect} from "next/navigation";
import {requireComunAdminProfile} from "@/lib/admin-auth";
import {canAccessOperationalSurface} from "@/lib/operational-authorization";
import {createServiceSupabaseClient} from "@/lib/supabase/server";
import {OPERATION_QUEUES,QUEUE_LABELS,type OperationQueue} from "@/lib/editorial-operation";
export default async function OperationPage(){
 const session=await requireComunAdminProfile(); if(!canAccessOperationalSurface(session.profile,"central"))redirect("/comun/admin"); const db=createServiceSupabaseClient();
 const {data}=db ? await db.from("comun_editorial_operation_items").select("id,queue,state,title,priority,indicative_due_at,next_action").order("priority").order("created_at").limit(100) : {data:[]};
 const rows=data??[];
 return <main className="mx-auto max-w-6xl p-6"><header><p className="text-sm font-semibold uppercase">Operação editorial</p><h1 className="text-3xl font-bold">Central operacional</h1><p>Filas finitas, prazos indicativos e decisões sempre humanas.</p></header><div className="mt-8 grid gap-4 md:grid-cols-2">{OPERATION_QUEUES.map(queue=><section key={queue} className="rounded-2xl border p-4" aria-labelledby={`q-${queue}`}><h2 id={`q-${queue}`} className="text-xl font-semibold">{QUEUE_LABELS[queue]}</h2><p className="text-sm">{rows.filter(r=>r.queue===queue).length} item(ns)</p><ul className="mt-3 space-y-2">{rows.filter(r=>r.queue===queue).slice(0,10).map(row=><li key={row.id}><Link className="underline" href={`/comun/admin/operacao/${row.id}`}>{row.title}</Link><span className="ml-2 text-sm">{row.state} · P{row.priority}</span></li>)}</ul>{!rows.some(r=>r.queue===queue)&&<p className="mt-3 text-sm">Fila vazia.</p>}</section>)}</div></main>
}
