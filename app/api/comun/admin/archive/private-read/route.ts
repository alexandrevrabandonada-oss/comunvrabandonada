import { NextResponse } from "next/server";
import { getComunAdminSession } from "@/lib/admin-auth";
import { getMediaStorage } from "@/lib/media-storage";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
export async function POST(request:Request){const session=await getComunAdminSession();if(!session)return NextResponse.json({error:"Não autorizado."},{status:401});const {assetId}=await request.json() as {assetId:string};const db=createServiceSupabaseClient();if(!db)return NextResponse.json({error:"Supabase não configurado."},{status:500});const {data}=await db.from("comun_archive_assets").select("object_key, bucket_scope").eq("id",assetId).eq("bucket_scope","private_original").maybeSingle();if(!data)return NextResponse.json({error:"Original não encontrado."},{status:404});try{return NextResponse.json(await getMediaStorage().createPrivateReadUrl(data.object_key,300));}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Falha."},{status:400});}}
