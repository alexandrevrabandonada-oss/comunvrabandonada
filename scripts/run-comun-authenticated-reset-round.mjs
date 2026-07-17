import{spawn,spawnSync}from"node:child_process";import{writeFile}from"node:fs/promises";
const round=process.argv[2];if(!["1","2"].includes(round))throw new Error("Use rodada 1 ou 2.");
const env={...process.env,COMUN_RESET_ROUND:round};const records=[];
const local=(label,command,args)=>[label,"node",["scripts/comun-local-env.mjs","run",command,...args]];
const server=spawn("node",["scripts/comun-local-env.mjs","run","npm","run","dev"],{cwd:process.cwd(),env,stdio:"ignore",shell:process.platform==="win32"});
const deadline=Date.now()+120000;let ready=false;while(Date.now()<deadline){try{if((await fetch("http://127.0.0.1:3000/comun")).ok){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,500))}if(!ready)throw new Error("next dev local não ficou pronto");
const commands=[
 local("reset","npx",["supabase","db","reset","--local"]),
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
try{for(const[label,command,args]of commands){const started=Date.now();const result=spawnSync(command,args,{cwd:process.cwd(),env,encoding:"utf8",shell:process.platform==="win32",stdio:["ignore","pipe","pipe"],maxBuffer:64*1024*1024});records.push({label,ok:result.status===0,durationMs:Date.now()-started});if(result.status!==0){await writeFile(`reports/comun-reset-${round}-33-2-1.json`,JSON.stringify({round,ok:false,records},null,2)+"\n");process.stderr.write(result.stderr.slice(-2000));process.exit(result.status??1)}}await writeFile(`reports/comun-reset-${round}-33-2-1.json`,JSON.stringify({round,ok:true,records},null,2)+"\n");console.log(`COMUN_RESET_AUTH_ROUND_${round}_OK`)}finally{if(process.platform==="win32"&&server.pid)spawnSync("taskkill",["/PID",String(server.pid),"/T","/F"],{stdio:"ignore"});else server.kill()}
