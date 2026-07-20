import { loadLocalEnv } from './env-loader.mjs';
import { assertLocalEnvironment } from './local-environment.mjs';
loadLocalEnv();
const base=assertLocalEnvironment();
const routes=[['/comun/pautas','Pautas'],['/comun/comunidades','Comunidades'],['/comun/dossies','Dossies'],['/comun/seguranca','Como o COMUN protege relatos'],['/comun/relatar','Relato']];
for(const [path,text] of routes){const r=await fetch(`${base}${path}`),html=await r.text();if(r.status!==200)throw new Error(`${path} retornou ${r.status}`);if(!html.includes(text))throw new Error(`${path} não apresentou o contrato público`);console.log(`ok ${path}`)}
for(const path of ['/comun/pautas/slug-inexistente','/comun/dossies/slug-inexistente']){const r=await fetch(`${base}${path}`);if(r.status!==404)throw new Error(`${path} deveria retornar 404`);console.log(`ok 404 ${path}`)}
console.log('smoke:core-public-routes ok');
