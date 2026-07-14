import { loadLocalEnv } from "./env-loader.mjs";
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
loadLocalEnv();
if(process.env.PRODUCTION_VERIFICATION_CLEANUP_CONFIRM!=="true") throw new Error("Cleanup bloqueado: confirme explicitamente.");
const runId=process.env.PRODUCTION_VERIFICATION_RUN_ID;
if(!runId || !/^[0-9a-f-]{36}$/i.test(runId)) throw new Error("Run ID invalido.");
const prefix=`smoke/production-verification/${runId}/`;
const required=["R2_ENDPOINT","R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY","R2_BUCKET_ORIGINALS","R2_BUCKET_PUBLIC"];
if(required.some(k=>!process.env[k])) throw new Error("Configuracao server-side incompleta.");
const client=new S3Client({region:"auto",endpoint:process.env.R2_ENDPOINT,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY}});
let removed=0;
for(const Bucket of [process.env.R2_BUCKET_ORIGINALS,process.env.R2_BUCKET_PUBLIC]){let token; do{const listed=await client.send(new ListObjectsV2Command({Bucket,Prefix:prefix,ContinuationToken:token})); const objects=(listed.Contents??[]).filter(x=>x.Key?.startsWith(prefix)).map(x=>({Key:x.Key})); if(objects.length){await client.send(new DeleteObjectsCommand({Bucket,Delete:{Objects:objects,Quiet:true}})); removed+=objects.length} token=listed.NextContinuationToken}while(token)}
console.log(JSON.stringify({runId,removed,scope:"production_verification_only"}));
