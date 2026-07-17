import{readFile,rm}from"node:fs/promises";

export default async function operationalGlobalTeardown(){
 const fixtures=await import("./operational-personas.mjs");
 const local=await import("./local-fixtures.mjs");
 let manifest=null;
 try{
  manifest=JSON.parse(await readFile(".local/comun-auth/current.json","utf8"));
  if(manifest?.itemId)await local.localServiceClient().from("comun_editorial_operation_items").delete().eq("id",manifest.itemId);
 }catch{}
 await fixtures.cleanupOperationalPersonas({runId:manifest?.runId});
 await rm(".local/comun-auth",{recursive:true,force:true});
 console.log("COMUN_TEST_FIXTURES_CLEAN");
}
