// Diagnóstico isolado de Auth local pós-reset — Sprint 33.2.1.
// Executa o fluxo completo por persona com timestamps e registra a primeira falha.
// Uso: ALLOW_LOCAL_TESTS=true COMUN_BASE_URL=http://127.0.0.1:3000 node scripts/diag-comun-auth-reset-33-2-1.mjs [--all]
import{createClient}from"@supabase/supabase-js";
import{assertLocalEnvironment}from"./local-environment.mjs";
import{localServiceClient,localPublicConfig,localFixturePassword}from"../tests/fixtures/comun/local-fixtures.mjs";
import{operationalPersonas,operationalEmail,cleanupOperationalPersonas}from"../tests/fixtures/comun/operational-personas.mjs";

assertLocalEnvironment();
const runId=`diag-${Date.now().toString(36)}`;
const requested=process.argv.includes("--all")?Object.keys(operationalPersonas):["operations_admin","privacy_reviewer","participant"];
const events=[];
const mark=(persona,step,ok,detail="")=>{const at=new Date().toISOString();events.push({at,persona,step,ok,detail});console.log(`${at} ${ok?"OK  ":"FAIL"} ${persona} ${step}${detail?` — ${detail}`:""}`)};
const firstFailure=()=>events.find(e=>!e.ok);

async function step(persona,name,fn){try{const detail=await fn();mark(persona,name,true,detail??"");return true}catch(error){mark(persona,name,false,error?.message??String(error));return false}}

const db=localServiceClient();
const pub=localPublicConfig();
if(!pub.anonKey)throw new Error("Anon key local ausente");
const anon=()=>createClient(pub.url,pub.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});

async function health(){const res=await fetch(`${pub.url}/auth/v1/health`);if(!res.ok)throw new Error(`auth health ${res.status}`);return `status=${res.status}`}

async function diagnose(persona){
 const email=operationalEmail(persona,runId);const password=localFixturePassword;let user=null;let session=null;
 if(!await step(persona,"00-auth-health",health))return;
 if(!await step(persona,"01-create",async()=>{const r=await db.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{fixture:"s33-2-1-diag",persona,run_id:runId}});if(r.error)throw r.error;user=r.data.user;return `id=${user.id.slice(0,8)}`}))return;
 await step(persona,"02-auth-users",async()=>{const r=await db.auth.admin.listUsers({perPage:1000});if(r.error)throw r.error;const found=r.data.users.find(u=>u.email===email);if(!found)throw new Error("usuário não listado");return `email_confirmado=${Boolean(found.email_confirmed_at)}`});
 await step(persona,"03-identities",async()=>{const r=await db.auth.admin.getUserById(user.id);if(r.error)throw r.error;const ids=r.data.user?.identities??[];if(!ids.some(i=>i.provider==="email"))throw new Error("identity email ausente");return `identities=${ids.length}`});
 await step(persona,"04-member-profile",async()=>{const r=await db.from("comun_member_profiles").upsert({user_id:user.id,display_name:`Diag ${persona}`,participation_visibility:"private",status:"active",onboarding_completed_at:new Date().toISOString(),terms_version:"diag",terms_accepted_at:new Date().toISOString(),privacy_version:"diag",privacy_accepted_at:new Date().toISOString()},{onConflict:"user_id"});if(r.error)throw r.error;return "upsert ok"});
 if(persona!=="participant")await step(persona,"05-admin-role",async()=>{const role=operationalPersonas[persona];let r=await db.from("comun_admin_users").upsert({user_id:user.id,email,role:persona==="admin"?"admin":"viewer",is_active:true},{onConflict:"email"});if(r.error)throw r.error;r=await db.from("comun_admin_profiles").upsert({auth_user_id:user.id,email,display_name:`Diag ${persona}`,role:persona==="admin"?"admin":"viewer",operational_role:role,active:true,operational_note:`diag:${runId}`},{onConflict:"email"});if(r.error)throw r.error;return "papel ok"});
 else mark(persona,"05-admin-role",true,"n/a (participant)");
 if(!await step(persona,"06-login",async()=>{const c=anon();const r=await c.auth.signInWithPassword({email,password});if(r.error)throw r.error;session=r.data.session;return `token=${Boolean(session?.access_token)}`}))return;
 await step(persona,"07-refresh",async()=>{const c=anon();const r=await c.auth.refreshSession({refresh_token:session.refresh_token});if(r.error)throw r.error;session=r.data.session??session;return "refresh ok"});
 await step(persona,"08-protected-route",async()=>{const c=anon();const r=await c.auth.getUser(session.access_token);if(r.error)throw r.error;if(r.data.user?.id!==user.id)throw new Error("token não resolve o usuário");return "getUser com token ok (RLS nega tabela ao authenticated, por contrato)"});
 await step(persona,"09-logout",async()=>{const c=anon();await c.auth.signOut({scope:"local"});return "logout ok"});
 if(!await step(persona,"10-cleanup",async()=>{await db.from("comun_admin_profiles").delete().eq("email",email);await db.from("comun_admin_users").delete().eq("email",email);await db.from("comun_member_profiles").delete().eq("user_id",user.id);const r=await db.auth.admin.deleteUser(user.id);if(r.error)throw r.error;return "removido"}))return;
 await step(persona,"11-assert-gone",async()=>{const r=await db.auth.admin.getUserById(user.id);if(r.data?.user)throw new Error("usuário ainda existe");return "ausente confirmada"});
 let recreated=null;
 if(!await step(persona,"12-recreate",async()=>{const r=await db.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{fixture:"s33-2-1-diag",persona,run_id:runId}});if(r.error)throw r.error;recreated=r.data.user;return `id=${recreated.id.slice(0,8)}`}))return;
 await step(persona,"13-second-login",async()=>{const c=anon();const r=await c.auth.signInWithPassword({email,password});if(r.error)throw r.error;return "segundo login ok"});
 await step(persona,"14-final-cleanup",async()=>{await db.from("comun_member_profiles").delete().eq("user_id",recreated.id);const r=await db.auth.admin.deleteUser(recreated.id);if(r.error)throw r.error;return "removido"});
}

console.log(`AUTH_DIAG_33_2_1 run=${runId} personas=${requested.length} inicio=${new Date().toISOString()}`);
try{for(const persona of requested)await diagnose(persona)}finally{await cleanupOperationalPersonas()}
const failure=firstFailure();
if(failure){console.log(`FIRST_FAILURE persona=${failure.persona} step=${failure.step} at=${failure.at} detail=${failure.detail}`);process.exitCode=1}
else console.log("COMUN_AUTH_RESET_DIAG_OK");
