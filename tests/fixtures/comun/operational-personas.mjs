import{randomUUID}from"node:crypto";
import{createClient}from"@supabase/supabase-js";
import{localPublicConfig,localServiceClient,localFixturePassword}from"./local-fixtures.mjs";

export const operationalPersonas={admin:null,operations_admin:"operations_admin",privacy_reviewer:"privacy_reviewer",rights_reviewer:"rights_reviewer",archive_curator:"archive_curator",coordinator:"coordinator",facilitator:"facilitator",contribution_reviewer:"contribution_reviewer",image_reviewer:"image_reviewer",protocol_operator:"protocol_operator",result_editor:"result_editor",radio_editor:"radio_editor",art_editor:"art_editor",participant:null};
export const operationalPassword=localFixturePassword;
export const operationalRunId=(process.env.COMUN_TEST_RUN_ID||`${Date.now().toString(36)}-${randomUUID().slice(0,8)}`).toLowerCase().replace(/[^a-z0-9-]/g,"-");
export const operationalSuite=(process.env.COMUN_TEST_SUITE||"auth").toLowerCase().replace(/[^a-z0-9-]/g,"-");
export const operationalEmail=(persona,runId=operationalRunId,suite=operationalSuite)=>`fixture-s33-2-${suite}-${runId}-${persona.replaceAll("_","-")}@comun.test`;
const fixturePrefix="fixture-s33-2-";

async function checked(error,label){if(error)throw new Error(`${label}: ${error.message}`)}

// Factory única e idempotente de persona operacional local.
// Recusa host remoto via localServiceClient/localPublicConfig (assertLocalEnvironment).
// Não depende de UUID fixo: localiza por e-mail e repara estado parcial.
export async function ensureLocalOperationalPersona({persona,runId=operationalRunId,email=operationalEmail(persona,runId),password=operationalPassword,globalRole=persona==="admin"?"admin":"viewer",pautaRole=null}={}){
 if(!operationalPersonas.hasOwnProperty(persona))throw new Error(`Persona desconhecida: ${persona}`);
 const db=localServiceClient();
 const list=await db.auth.admin.listUsers({page:1,perPage:1000});
 await checked(list.error,"listar Auth");
 let user=list.data.users.find(item=>item.email===email);
 if(!user){
  const created=await db.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{fixture:"s33-2",persona,run_id:runId}});
  await checked(created.error,`criar ${persona}`);user=created.data.user;
 }else{
  const updated=await db.auth.admin.updateUserById(user.id,{password,email_confirm:true,app_metadata:{...user.app_metadata,fixture:"s33-2",persona,run_id:runId}});
  await checked(updated.error,`atualizar ${persona}`);user=updated.data.user;
 }
 if(!user?.identities?.some(identity=>identity.provider==="email"))throw new Error(`identity ausente: ${persona}`);
 await checked((await db.from("comun_member_profiles").upsert({user_id:user.id,display_name:`Fixture ${persona}`,participation_visibility:"private",status:"active",onboarding_completed_at:new Date().toISOString(),terms_version:"fixture",terms_accepted_at:new Date().toISOString(),privacy_version:"fixture",privacy_accepted_at:new Date().toISOString()},{onConflict:"user_id"})).error,`perfil ${persona}`);
 const operational_role=operationalPersonas[persona];
 if(persona!=="participant"){
  await checked((await db.from("comun_admin_users").upsert({user_id:user.id,email,role:globalRole,is_active:true},{onConflict:"email"})).error,`papel global ${persona}`);
  await checked((await db.from("comun_admin_profiles").upsert({auth_user_id:user.id,email,display_name:`Fixture ${persona}`,role:globalRole,operational_role,active:true,operational_note:`fixture-s33-2:${runId}`},{onConflict:"email"})).error,`perfil admin ${persona}`);
 }
 const publicConfig=localPublicConfig();
 if(!publicConfig.anonKey)throw new Error("Anon key local ausente");
 const auth=createClient(publicConfig.url,publicConfig.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const login=await auth.auth.signInWithPassword({email,password});
 await checked(login.error,`login ${persona}`);
 if(login.data.user.id!==user.id||!login.data.session?.access_token||!login.data.session.refresh_token)throw new Error(`sessão inconsistente: ${persona}`);
 const validated=await auth.auth.getUser(login.data.session.access_token);
 await checked(validated.error,`token ${persona}`);
 const refreshed=await auth.auth.refreshSession({refresh_token:login.data.session.refresh_token});
 await checked(refreshed.error,`refresh ${persona}`);
 await auth.auth.signOut({scope:"local"});
 return{user,session:refreshed.data.session,email,persona,runId,pautaRole,profileId:user.id,globalRole,createdAt:new Date().toISOString(),sessionValidatedAt:new Date().toISOString()};
}

export async function createOperationalPersonas(){
 const manifest=[];
 for(const persona of Object.keys(operationalPersonas))manifest.push(await ensureLocalOperationalPersona({persona}));
 return manifest;
}

// Cleanup completo: remove vínculos (member_profiles não tem FK para auth.users),
// papéis e o usuário Auth. Qualquer fixture com o prefixo é removida, de qualquer run.
export async function cleanupOperationalPersonas({runId}={}){
 const db=localServiceClient();
 const list=await db.auth.admin.listUsers({page:1,perPage:1000});
 const fixtures=(list.data?.users??[]).filter(user=>user.email?.startsWith(fixturePrefix)&&(!runId||user.app_metadata?.run_id===runId));
 const ids=fixtures.map(user=>user.id);
 const emails=fixtures.map(user=>user.email).filter(Boolean);
 if(emails.length){
  await db.from("comun_admin_profiles").delete().in("email",emails);
  await db.from("comun_admin_users").delete().in("email",emails);
 }
 if(ids.length)await db.from("comun_member_profiles").delete().in("user_id",ids);
 for(const user of fixtures)await checked((await db.auth.admin.deleteUser(user.id)).error,`cleanup ${user.id}`);
}
