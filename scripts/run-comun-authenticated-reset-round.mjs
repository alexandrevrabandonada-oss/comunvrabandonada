import{spawnSync}from"node:child_process";import{writeFile}from"node:fs/promises";
const round=process.argv[2];if(!["1","2"].includes(round))throw new Error("Use rodada 1 ou 2.");
const env={...process.env,COMUN_RESET_ROUND:round};const records=[];
const commands=[
 ["reset","npx",["supabase","db","reset","--local"]],
 ["storage","npm",["run","storage:readiness"]],
 ["unit","npm",["run","test:unit"]],
 ["e2e","node",["scripts/comun-local-env.mjs","run","npm","run","test:e2e:editorial-operation-authenticated"]],
 ["axe","node",["scripts/comun-local-env.mjs","run","npm","run","test:a11y:editorial-operation-authenticated"]],
 ["visual","node",["scripts/comun-local-env.mjs","run","npm","run","test:visual:editorial-operation-authenticated"]],
 ["rehearsal-auth","npm",["run","smoke:first-pilot-authenticated-rehearsal"]],
 ["rehearsal","npm",["run","smoke:first-pilot-rehearsal"]],
 ["editorial","npm",["run","smoke:editorial-operation"]],
 ["sidewalk","npm",["run","smoke:sidewalk-pilot"]],
 ["central","npm",["run","smoke:central-experience"]],
 ["pauta","npm",["run","smoke:pauta-miniapp"]],
 ["radio","npm",["run","smoke:community-radio"]],
 ["art-storage","npm",["run","smoke:territorial-art-storage"]],
 ["art","npm",["run","smoke:territorial-art"]],
 ["community-auth","npm",["run","smoke:community-auth:local"]],
 ["public-ui","npm",["run","smoke:public-ui:local"]],
 ["no-leak","npm",["run","smoke:no-leak-http"]],
 ["cleanup","npm",["run","test:fixtures:cleanup"]],
 ["assert-clean","npm",["run","test:fixtures:assert-clean"]],
];
for(const[label,command,args]of commands){const started=Date.now();const result=spawnSync(command,args,{cwd:process.cwd(),env,encoding:"utf8",shell:process.platform==="win32",stdio:["ignore","pipe","pipe"]});records.push({label,ok:result.status===0,durationMs:Date.now()-started});if(result.status!==0){await writeFile(`reports/comun-reset-${round}-33-2-1.json`,JSON.stringify({round,ok:false,records},null,2)+"\n");process.stderr.write(result.stderr.slice(-2000));process.exit(result.status??1)}}
await writeFile(`reports/comun-reset-${round}-33-2-1.json`,JSON.stringify({round,ok:true,records},null,2)+"\n");console.log(`COMUN_AUTHENTICATED_RESET_${round}_OK`);
