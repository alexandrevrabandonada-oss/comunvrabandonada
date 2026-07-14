import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const db = createServiceSupabaseClient(); if (!db) return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 });
  const form = await request.formData(); const value = (key:string) => String(form.get(key) ?? '').trim();
  if (value('website')) return NextResponse.redirect(new URL('/comun/acervo/historias-orais', request.url), 303);
  if (value('challenge') !== '7') return NextResponse.json({ error: 'Desafio inválido' }, { status: 400 });
  const title = value('suggested_person_or_theme').slice(0,160), story = value('story_summary').slice(0,4000); if (!title || story.length < 20) return NextResponse.json({ error: 'Preencha a sugestão' }, { status: 400 });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'; const salt = process.env.COMUN_HASH_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-24) ?? 'local'; const submitterHash = createHash('sha256').update(`${salt}:${ip}`).digest('hex');
  const since = new Date(Date.now()-86400000).toISOString(); const count = await db.from('comun_archive_oral_history_suggestions').select('id',{count:'exact',head:true}).eq('submitter_hash',submitterHash).gte('created_at',since); if ((count.count??0)>=3) return NextResponse.json({ error: 'Limite diário atingido' }, { status: 429 });
  const result = await db.from('comun_archive_oral_history_suggestions').insert({ suggested_person_or_theme:title, story_summary:story, city:value('city').slice(0,100)||null, neighborhood:value('neighborhood').slice(0,100)||null, period_public:value('period_public').slice(0,100)||null, relationship_public:value('relationship_public').slice(0,500)||null, contact_private:value('contact_private').slice(0,240)||null, available_for_interview:form.get('available_for_interview')==='on', credit_preference:value('credit_preference').slice(0,160)||null, submitter_hash:submitterHash }); if(result.error)return NextResponse.json({error:'Não foi possível registrar'},{status:400});
  return NextResponse.redirect(new URL('/comun/acervo/historias-orais?enviado=1',request.url),303);
}
