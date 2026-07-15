import {createClient,type SupabaseClient} from "@supabase/supabase-js";import type{BucketScope,MediaObjectMetadata,MediaObjectSummary,MediaStorageProvider,UploadUrlInput}from"./types";
const buckets:Record<BucketScope,string>={private_original:"archive-private-originals",public_safe:"archive-public-derivatives"};
function localConfig(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"",key=process.env.SUPABASE_SERVICE_ROLE_KEY||"";if(!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url))throw new Error("SupabaseLocalStorageProvider exige URL localhost.");if(!key)throw new Error("Service role local ausente.");return{url,key}}
function safeKey(key:string){if(!/^(originals|public|fixtures)\/[a-zA-Z0-9_./-]+$/.test(key)||key.includes("..")||key.includes("//"))throw new Error("Object key local inválida.");return key}
export class SupabaseLocalStorageProvider implements MediaStorageProvider{private db:SupabaseClient;private url:string;constructor(){const c=localConfig();this.url=c.url;this.db=createClient(c.url,c.key,{auth:{persistSession:false}})}
 async createUploadTarget(input:UploadUrlInput){safeKey(input.key);const{data,error}=await this.db.storage.from(buckets[input.scope]).createSignedUploadUrl(input.key);if(error)throw error;return{url:data.signedUrl,token:data.token,key:input.key,expiresAt:new Date(Date.now()+2*60*60*1000)}}
 async createUploadUrl(input:UploadUrlInput){const x=await this.createUploadTarget(input);return{url:x.url,expiresAt:x.expiresAt}}
 async confirmUpload(scope:BucketScope,key:string){const x=await this.headObject(scope,key);if(!x)throw new Error("Objeto local não encontrado para confirmação.");return x}
 async headObject(scope:BucketScope,key:string){return this.getObjectMetadata(scope,key)}
 async readObject(scope:BucketScope,key:string){const{data,error}=await this.db.storage.from(buckets[scope]).download(safeKey(key));if(error)throw error;return new Uint8Array(await data.arrayBuffer())}
 async writeDerivative(input:UploadUrlInput&{body:Uint8Array}){await this.putObject(input)}
 async removeObject(scope:BucketScope,key:string){await this.deleteObject(scope,key)}
 async listFixtureScopeForCleanup(prefix:string){return[...(await this.listObjects("private_original",prefix)),...(await this.listObjects("public_safe",prefix))]}
 createPublicDerivativeUrl(key:string){return`${this.url}/storage/v1/object/public/${buckets.public_safe}/${safeKey(key)}`}
 async createPrivateReadUrl(key:string,expiresIn=300){const{data,error}=await this.db.storage.from(buckets.private_original).createSignedUrl(safeKey(key),Math.min(expiresIn,900));if(error)throw error;return{url:data.signedUrl,expiresAt:new Date(Date.now()+Math.min(expiresIn,900)*1000)}}
 async putObject(input:UploadUrlInput&{body:Uint8Array}){safeKey(input.key);const{error}=await this.db.storage.from(buckets[input.scope]).upload(input.key,input.body,{contentType:input.contentType,upsert:false});if(error)throw error}
 async deleteObject(scope:BucketScope,key:string){const{error}=await this.db.storage.from(buckets[scope]).remove([safeKey(key)]);if(error)throw error}
 async copyObject(a:BucketScope,ak:string,b:BucketScope,bk:string){const body=await this.readObject(a,ak);await this.putObject({scope:b,key:bk,contentType:"application/octet-stream",sizeBytes:body.byteLength,body})}
 async objectExists(scope:BucketScope,key:string){return Boolean(await this.getObjectMetadata(scope,key))}
 async getObjectMetadata(scope:BucketScope,key:string){const body=await this.readObject(scope,key).catch(()=>null);return body?{contentLength:body.byteLength}:null}
 async listObjects(scope:BucketScope,prefix:string){safeKey(prefix);const{data,error}=await this.db.storage.from(buckets[scope]).list(prefix,{limit:1000});if(error)throw error;return(data??[]).map(x=>({key:`${prefix.replace(/\/$/,"")}/${x.name}`,size:x.metadata?.size,lastModified:x.updated_at?new Date(x.updated_at):undefined,etag:x.metadata?.eTag}))as MediaObjectSummary[]}
}
