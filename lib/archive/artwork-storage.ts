import crypto from "node:crypto";
import sharp from "sharp";
import type {MediaStorageProvider} from "../media-storage/types";

const allowed = new Map([
  ["image/jpeg", [[0xff,0xd8,0xff]]],
  ["image/png", [[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]]],
  ["image/webp", [[0x52,0x49,0x46,0x46]]],
]);
export async function validateArtworkImage(body:Uint8Array,mime:string,filename:string){
  if(!allowed.has(mime)||!/\.(jpe?g|png|webp)$/i.test(filename)||/\.(svg|html?|pdf|gif|exe)\./i.test(filename))throw new Error("ART_STORAGE_TYPE_INVALID");
  if(body.byteLength<12||body.byteLength>30*1024*1024)throw new Error("ART_STORAGE_SIZE_INVALID");
  if(!(allowed.get(mime)??[]).some(sig=>sig.every((x,i)=>body[i]===x))||(mime==="image/webp"&&Buffer.from(body.slice(8,12)).toString()!=="WEBP"))throw new Error("ART_STORAGE_MAGIC_INVALID");
  const meta=await sharp(body,{animated:false,limitInputPixels:80_000_000}).metadata();
  if(!meta.width||!meta.height||(meta.pages&&meta.pages>1)||meta.width*meta.height>80_000_000)throw new Error("ART_STORAGE_DIMENSIONS_INVALID");
  return{mime,width:meta.width,height:meta.height,size:body.byteLength,checksum:crypto.createHash("sha256").update(body).digest("hex")};
}
export async function processArtworkDerivatives(input:{itemId:string;originalKey:string;mime:string;filename:string;allowSocial?:boolean;provider?:MediaStorageProvider}){
  const provider=input.provider??(await import("../media-storage/index")).getMediaStorage(),body=await provider.readObject("private_original",input.originalKey),original=await validateArtworkImage(body,input.mime,input.filename),outputs=[];
  for(const[role,width]of[["thumbnail",400],["card",960],["detail",2000]]as const){
    const derivative=await sharp(body,{limitInputPixels:80_000_000}).rotate().resize({width,withoutEnlargement:true}).webp({quality:84}).toBuffer(),key=`public/${input.itemId}/${role}.webp`,meta=await sharp(derivative).metadata();
    await provider.removeObject("public_safe",key).catch(()=>{});
    await provider.writeDerivative({scope:"public_safe",key,contentType:"image/webp",sizeBytes:derivative.byteLength,body:derivative});
    outputs.push({role,key,size:derivative.byteLength,width:meta.width,height:meta.height,checksum:crypto.createHash("sha256").update(derivative).digest("hex"),url:provider.createPublicDerivativeUrl(key)});
  }
  return{original,outputs};
}
export async function cleanupArtworkStorageScope(prefix:string,{dryRun=true,provider}:{dryRun?:boolean;provider:MediaStorageProvider}){
  if(!/^(fixtures|originals|public)\/[a-zA-Z0-9_-]+\/?$/.test(prefix))throw new Error("Escopo de cleanup inválido.");
  const objects=await provider.listFixtureScopeForCleanup(prefix);
  if(!dryRun)for(const x of objects)await provider.removeObject(x.key.startsWith("public/")?"public_safe":"private_original",x.key);
  return{dryRun,count:objects.length,keys:objects.map(x=>crypto.createHash("sha256").update(x.key).digest("hex").slice(0,12))};
}
