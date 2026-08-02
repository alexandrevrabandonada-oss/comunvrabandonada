import{execFileSync}from"node:child_process";
import{randomUUID}from"node:crypto";
import{mkdir,rm,writeFile}from"node:fs/promises";
import{chromium}from"@playwright/test";
import{validateOperationalStorageState}from"./operational-storage-state.mjs";
import{assertLocalEnvironment}from"../../../scripts/local-environment.mjs";

// O processo global do Playwright é separado do webServer. Inicialize nele o
// mesmo contrato local antes de tocar em Auth, mantendo a recusa de destinos remotos.
export function prepareOperationalLocalEnvironment(){
 process.env.DO_NOT_TRACK="1";
 process.env.SUPABASE_DISABLE_TELEMETRY="1";
 process.env.ALLOW_LOCAL_TESTS="true";
 process.env.COMUN_BASE_URL??="http://127.0.0.1:3000";
 process.env.MEDIA_STORAGE_PROVIDER??="supabase-local";
 assertLocalEnvironment();
}

// Gate obrigatório: o Playwright não inicia sem COMUN_LOCAL_AUTH_READY.
function requireAuthReadiness(){
 const output=execFileSync("node",["scripts/check-comun-auth-readiness.mjs"],{encoding:"utf8",env:process.env});
 if(!output.includes("COMUN_LOCAL_AUTH_READY"))throw new Error("Auth readiness não emitiu COMUN_LOCAL_AUTH_READY");
}

export async function operationalGlobalSetup({suite="authenticated"}={}){
 prepareOperationalLocalEnvironment();
 requireAuthReadiness();
 const runId=`${Date.now().toString(36)}-${randomUUID().slice(0,8)}`;
 process.env.COMUN_TEST_RUN_ID=runId;
 process.env.COMUN_TEST_SUITE=suite;
 const fixtures=await import("./operational-personas.mjs");
 const local=await import("./local-fixtures.mjs");
 const base=process.env.COMUN_BASE_URL??"http://127.0.0.1:3000";
 await fixtures.cleanupOperationalPersonas();
 const personas=await fixtures.createOperationalPersonas();
 const db=local.localServiceClient();
 const fixtureKey=`fixture-s33-2-1:${runId}`;
 const inserted=await db.from("comun_editorial_operation_items").insert({source_type:"contribution",source_key:fixtureKey,idempotency_key:`fixture:${fixtureKey}`,queue:"withdrawals",title:"Retirada urgente sintética",next_action:"Conter publicação",human_gate:"Confirmação humana",fixture_tag:fixtureKey}).select("id").single();
 if(inserted.error||!inserted.data)throw new Error(inserted.error?.message??"item fixture");
 const root=`.local/comun-auth/${runId}`;
 await rm(".local/comun-auth",{recursive:true,force:true}).catch(()=>{});
 await mkdir(root,{recursive:true});
 const browser=await chromium.launch();
 try{
  for(const entry of personas){
   const context=await browser.newContext();
   const page=await context.newPage();
   const participant=entry.persona==="participant";
   const redirect=participant?"/comun/minha-participacao":"/comun/admin/acervo";
   const heading=participant?"Minha área":"Acervo";
   await page.goto(`${base}${participant?"/comun/entrar":"/comun/admin/login"}?${participant?"returnTo":"redirectTo"}=${encodeURIComponent(redirect)}`);
   await page.getByLabel("E-mail").fill(entry.email);
   await page.getByLabel("Senha").fill(fixtures.operationalPassword);
   await Promise.all([page.waitForURL(url=>!url.pathname.includes(participant?"/entrar":"/admin/login")),page.getByRole("button",{name:"Entrar"}).click()]);
   await page.getByRole("heading",{name:heading}).waitFor({state:"visible"});
   if(await page.getByLabel("E-mail").count())throw new Error(`login ainda visível: ${entry.persona}`);
   if(!participant)await page.getByText(entry.email,{exact:true}).waitFor({state:"visible"});
   if(!(await context.cookies()).some(cookie=>/^sb-.*auth-token/i.test(cookie.name)&&Boolean(cookie.value)))throw new Error(`cookie de sessão ausente: ${entry.persona}`);
   const state=`${root}/${entry.persona}.json`;
   // Salvar somente após login, heading, identidade e cookie confirmados.
   await context.storageState({path:state});
   await validateOperationalStorageState({browser,path:state,persona:entry.persona,runId,baseUrl:base,protectedPath:redirect,heading,identityEmail:participant?null:entry.email});
   await context.close();
  }
 }finally{await browser.close()}
 await writeFile(".local/comun-auth/current.json",JSON.stringify({runId,suite,itemId:inserted.data.id,generatedAt:new Date().toISOString(),personas:personas.map(({persona,email,user,globalRole,pautaRole,createdAt,sessionValidatedAt})=>({persona,email,userId:user.id,profileId:user.id,globalRole,pautaRole,createdAt,sessionValidatedAt,state:`${root}/${persona}.json`}))},null,2)+"\n");
}
export default operationalGlobalSetup;
