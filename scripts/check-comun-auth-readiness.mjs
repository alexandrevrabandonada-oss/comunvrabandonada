// Readiness de Auth local — gate obrigatório antes de qualquer suíte Playwright.
// Valida: endpoint, criação, login, refresh, rota protegida (getUser), logout,
// remoção e ausência de resíduo. Saída de sucesso: COMUN_LOCAL_AUTH_READY.
import{createClient}from"@supabase/supabase-js";
import{assertLocalEnvironment}from"./local-environment.mjs";
import{localServiceClient,localPublicConfig,localFixturePassword}from"../tests/fixtures/comun/local-fixtures.mjs";

assertLocalEnvironment();
const email=`fixture-auth-readiness-${Date.now().toString(36)}@comun.test`;
const db=localServiceClient();
const pub=localPublicConfig();
if(!pub.anonKey)throw new Error("Anon key local ausente");
const anon=()=>createClient(pub.url,pub.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});

let user=null;
async function run(){
 const health=await fetch(`${pub.url}/auth/v1/health`);
 if(!health.ok)throw new Error(`endpoint Auth indisponível: ${health.status}`);
 const created=await db.auth.admin.createUser({email,password:localFixturePassword,email_confirm:true,app_metadata:{fixture:"auth-readiness"}});
 if(created.error||!created.data.user)throw new Error(`criação: ${created.error?.message??"sem usuário"}`);
 user=created.data.user;
 const client=anon();
 const login=await client.auth.signInWithPassword({email,password:localFixturePassword});
 if(login.error||!login.data.session)throw new Error(`login: ${login.error?.message??"sem sessão"}`);
 const refreshed=await client.auth.refreshSession({refresh_token:login.data.session.refresh_token});
 if(refreshed.error||!refreshed.data.session?.access_token)throw new Error(`refresh: ${refreshed.error?.message??"sem sessão"}`);
 const validated=await anon().auth.getUser(refreshed.data.session.access_token);
 if(validated.error||validated.data.user?.id!==user.id)throw new Error(`rota protegida: ${validated.error?.message??"token não resolve usuário"}`);
 await client.auth.signOut({scope:"local"});
 const removed=await db.auth.admin.deleteUser(user.id);
 if(removed.error)throw new Error(`remoção: ${removed.error.message}`);
 user=null;
 const residue=await db.auth.admin.listUsers({perPage:1000});
 const left=residue.data?.users?.filter(item=>item.email?.startsWith("fixture-auth-readiness-"))??[];
 if(left.length)throw new Error(`resíduo de readiness: ${left.length} usuário(s)`);
 console.log("COMUN_LOCAL_AUTH_READY");
}
try{await run()}catch(error){if(user)await db.auth.admin.deleteUser(user.id).catch(()=>{});console.error(`AUTH_READINESS_FAIL ${error?.message??error}`);process.exit(1)}
