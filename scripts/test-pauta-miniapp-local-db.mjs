import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertLocalEnvironment } from "./local-environment.mjs";

assertLocalEnvironment();
const sql = `
do $$
declare pauta uuid; circle uuid; other_circle uuid; open_round uuid; closed_round uuid; other_round uuid; member uuid := gen_random_uuid();
begin
  insert into public.comun_pauta_spaces(slug,title,summary) values ('fixture-s28-1-' || substr(gen_random_uuid()::text,1,8),'Fixture Sprint 28.1','Somente teste local') returning id into pauta;
  insert into public.comun_pauta_modules(pauta_id,module_type,status,visibility,position,config) values(pauta,'overview','active','public',0,'{}');
  begin insert into public.comun_pauta_modules(pauta_id,module_type) values(pauta,'invalid'); raise exception 'module_type invalid accepted'; exception when check_violation then null; end;
  begin insert into public.comun_pauta_modules(pauta_id,module_type) values(pauta,'overview'); raise exception 'duplicate module accepted'; exception when unique_violation then null; end;
  begin insert into public.comun_pauta_modules(pauta_id,module_type,position) values(pauta,'map',-1); raise exception 'negative position accepted'; exception when check_violation then null; end;
  begin insert into public.comun_pauta_modules(pauta_id,module_type,config) values(pauta,'map','[]'); raise exception 'invalid config accepted'; exception when check_violation then null; end;
  insert into public.comun_construction_circles(pauta_id,title,public_question) values(pauta,'Roda fixture','Como melhorar?') returning id into circle;
  insert into public.comun_construction_circle_rounds(circle_id,round_type,title,public_prompt,position,status) values(circle,'listening','Escuta','Conte com cuidado',0,'open') returning id into open_round;
  begin insert into public.comun_construction_circle_rounds(circle_id,round_type,title,public_prompt,position,status) values(circle,'proposals','Duplicada','Outra rodada',1,'open'); raise exception 'two open rounds accepted'; exception when unique_violation then null; end;
  insert into public.comun_construction_circle_rounds(circle_id,round_type,title,public_prompt,position,status) values(circle,'proposals','Fechada','Rodada fechada',1,'closed') returning id into closed_round;
  begin insert into public.comun_circle_contributions(circle_id,round_id,contribution_type,public_body) values(circle,closed_round,'proposal','Uma contribuição de teste devidamente estruturada.'); raise exception 'closed round contribution accepted'; exception when raise_exception then null; end;
  insert into public.comun_circle_contributions(circle_id,round_id,contribution_type,public_body,private_contact,moderation_note_private) values(circle,open_round,'proposal','Uma contribuição de teste devidamente estruturada.','fixture@example.test','nota privada');
  insert into public.comun_construction_circles(pauta_id,title,public_question) values(pauta,'Outra roda','Outra pergunta') returning id into other_circle;
  insert into public.comun_construction_circle_rounds(circle_id,round_type,title,public_prompt,position,status) values(other_circle,'listening','Outra','Outra pergunta',0,'planned') returning id into other_round;
  begin insert into public.comun_circle_syntheses(circle_id,round_id,public_summary) values(circle,other_round,'Síntese inválida'); raise exception 'cross-circle synthesis accepted'; exception when raise_exception then null; end;
  insert into public.comun_pauta_memberships(pauta_id,member_user_id,role) values(pauta,member,'participant');
  begin insert into public.comun_pauta_memberships(pauta_id,member_user_id,role) values(pauta,member,'participant'); raise exception 'duplicate membership accepted'; exception when unique_violation then null; end;
  begin insert into public.comun_pauta_memberships(pauta_id,member_user_id,role) values(pauta,gen_random_uuid(),'invalid'); raise exception 'invalid membership role accepted'; exception when check_violation then null; end;
  if has_table_privilege('anon','public.comun_pauta_modules','select') or has_table_privilege('authenticated','public.comun_circle_contributions','select') then raise exception 'private table grant exposed'; end if;
  if not has_table_privilege('service_role','public.comun_circle_contributions','select') then raise exception 'service role grant missing'; end if;
  delete from public.comun_pauta_spaces where id = pauta;
end $$;
`;
const file = join(tmpdir(), `comun-s28-1-${Date.now()}.sql`);
writeFileSync(file, sql);
try { execFileSync("powershell", ["-NoProfile", "-Command", `Get-Content -LiteralPath '${file.replaceAll("'", "''")}' | npx supabase db query --local`], { stdio: "pipe", encoding: "utf8" }); }
finally { rmSync(file, { force: true }); }
console.log("PAUTA_MINIAPP_LOCAL_DB_OK cleanup=cascade-delete");
