import{spawn,spawnSync}from"node:child_process";import{writeFile}from"node:fs/promises";
import{readdir}from"node:fs/promises";import{waitForLocalSupabaseRecovery}from"./wait-comun-local-supabase-recovery.mjs";
const round=process.argv[2];if(!["1","2"].includes(round))throw new Error("Use rodada 1 ou 2.");
const status=spawnSync("powershell",["-NoProfile","-Command","$env:DO_NOT_TRACK='1'; $env:SUPABASE_DISABLE_TELEMETRY='1'; npx supabase status -o env"],{encoding:"utf8",stdio:["ignore","pipe","pipe"]});if(status.status!==0)throw new Error("Supabase local indisponível para o runner");const localEnv=Object.fromEntries(status.stdout.split(/\r?\n/).filter(Boolean).map(line=>{const index=line.indexOf("=");return[line.slice(0,index),line.slice(index+1).replace(/^\"|\"$/g,"")]}));Object.assign(process.env,{...localEnv,ALLOW_LOCAL_TESTS:"true",COMUN_BASE_URL:"http://127.0.0.1:3000",NEXT_PUBLIC_SITE_URL:"http://127.0.0.1:3000",NEXT_PUBLIC_SUPABASE_URL:localEnv.API_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY:localEnv.ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:localEnv.SERVICE_ROLE_KEY,MEDIA_STORAGE_PROVIDER:"supabase-local",DO_NOT_TRACK:"1",SUPABASE_DISABLE_TELEMETRY:"1"});
const env={...process.env,COMUN_RESET_ROUND:round};const records=[];
const local=(label,command,args)=>[label,"node",["scripts/comun-local-env.mjs","run",command,...args]];
const expectedMigrations=(await readdir("supabase/migrations")).filter(name=>name.endsWith(".sql")).length;
const appliedMigrations=()=>Number(spawnSync("docker",["exec","supabase_db_COMUM_VR_ABANDONADA","psql","-U","postgres","-d","postgres","-tAc","select count(*) from supabase_migrations.schema_migrations"],{cwd:process.cwd(),encoding:"utf8",shell:process.platform==="win32"}).stdout.trim());
async function rebuild(){const started=Date.now();const result=spawnSync("node",["scripts/comun-local-env.mjs","run","npx","supabase","db","reset","--local"],{cwd:process.cwd(),env,encoding:"utf8",shell:process.platform==="win32",stdio:["ignore","pipe","pipe"],maxBuffer:64*1024*1024});let recovery,restart=null;try{recovery=await waitForLocalSupabaseRecovery()}catch(error){const reason=String(error?.message??error),auth=spawnSync("docker",["inspect","-f","{{.State.Health.Status}}","supabase_auth_COMUM_VR_ABANDONADA"],{encoding:"utf8"}).stdout.trim();if(!reason.includes("auth http=502")||auth!=="healthy")throw error;const restarted=Date.now();const command=spawnSync("docker",["restart","supabase_kong_COMUM_VR_ABANDONADA"],{encoding:"utf8"});if(command.status!==0)throw new Error(`restart restrito de Kong falhou: ${command.stderr}`);recovery=await waitForLocalSupabaseRecovery();restart={service:"kong",reason:"auth saudável e upstream retornando 502",durationMs:Date.now()-restarted};console.log(`COMUN_LOCAL_KONG_RESTART_RECOVERED durationMs=${restart.durationMs}`)}const migrations=appliedMigrations();records.push({label:"reset",ok:result.status===0||migrations===expectedMigrations,durationMs:Date.now()-started,exitCode:result.status,migrations,expectedMigrations,recovered:recovery.ok,recoveryDurationMs:recovery.durationMs,restart});if(migrations!==expectedMigrations)throw new Error(`migrations incompletas: ${migrations}/${expectedMigrations}`);if(result.status!==0)console.log(`COMUN_RESET_TRANSIENT_RECOVERED exitCode=${result.status} migrations=${migrations}`)}
const server=spawn("node",["scripts/comun-local-env.mjs","run","npm","run","dev"],{cwd:process.cwd(),env,stdio:"ignore",shell:process.platform==="win32"});
const deadline=Date.now()+120000;let ready=false;while(Date.now()<deadline){try{if((await fetch("http://127.0.0.1:3000/comun")).ok){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,500))}if(!ready)throw new Error("next dev local não ficou pronto");
const commands=[
 ["reset",null,[]],
 local("storage","npm",["run","storage:readiness"]),
 local("auth-readiness","npm",["run","auth:readiness:local"]),
 local("unit","npm",["run","test:unit"]),
 local("e2e","npm",["run","test:e2e:editorial-operation-authenticated"]),
 local("axe","npm",["run","test:a11y:editorial-operation-authenticated"]),
 local("visual","npm",["run","test:visual:editorial-operation-authenticated"]),
 local("rehearsal-auth","npm",["run","smoke:first-pilot-authenticated-rehearsal"]),
 local("rehearsal","npm",["run","smoke:first-pilot-rehearsal"]),
 local("editorial","npm",["run","smoke:editorial-operation"]),
 local("sidewalk","npm",["run","smoke:sidewalk-pilot"]),
 local("central","npm",["run","smoke:central-experience"]),
 local("pauta","npm",["run","smoke:pauta-miniapp"]),
 local("radio","npm",["run","smoke:community-radio"]),
 local("art-storage","npm",["run","smoke:territorial-art-storage"]),
 local("art","npm",["run","smoke:territorial-art"]),
 local("community-auth","npm",["run","smoke:community-auth:local"]),
 local("public-ui","npm",["run","smoke:public-ui:local"]),
 local("no-leak","npm",["run","smoke:no-leak-http"]),
 local("cleanup","npm",["run","test:fixtures:cleanup"]),
 local("assert-clean","npm",["run","test:fixtures:assert-clean"]),
];
try{for(const[label,command,args]of commands){if(label==="reset"){await rebuild();continue}const started=Date.now();const result=spawnSync(command,args,{cwd:process.cwd(),env,encoding:"utf8",shell:process.platform==="win32",stdio:["ignore","pipe","pipe"],maxBuffer:64*1024*1024});records.push({label,ok:result.status===0,durationMs:Date.now()-started});if(result.status!==0){await writeFile(`reports/comun-reset-${round}-33-2-1.json`,JSON.stringify({round,ok:false,records},null,2)+"\n");process.stderr.write(result.stderr.slice(-2000));process.exit(result.status??1)}}await writeFile(`reports/comun-reset-${round}-33-2-1.json`,JSON.stringify({round,ok:true,records},null,2)+"\n");console.log(`COMUN_RESET_AUTH_ROUND_${round}_OK`)}catch(error){await writeFile(`reports/comun-reset-${round}-33-2-1.json`,JSON.stringify({round,ok:false,records,failure:String(error?.message??error)},null,2)+"\n");throw error}finally{if(process.platform==="win32"&&server.pid)spawnSync("taskkill",["/PID",String(server.pid),"/T","/F"],{stdio:"ignore"});else server.kill()}
