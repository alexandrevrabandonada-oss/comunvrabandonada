import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const identificationTypes = [
  "place_identification","date_correction","person_information","event_context",
  "photographer_information","source_information","historical_context","other",
] as const;

export const identificationTypeLabels: Record<string,string> = {
  place_identification:"Lugar", date_correction:"Data", person_information:"Pessoa",
  event_context:"Evento", photographer_information:"Autoria", source_information:"Fonte",
  historical_context:"Contexto histórico", other:"Outro",
};

const publicItemFields = "id,public_slug,public_title,public_prompt,preview_url,preview_width,preview_height,research_state,display_state,position,comment_count";
const publicCommentFields = "id,parent_id,suggestion_type,public_text,display_name_snapshot,status,publication_status,created_at";

export async function listIdentificationItems(input: { page?:number; q?:string; state?:string } = {}) {
  const db=createServiceSupabaseClient();
  if(!db)return {campaign:null,items:[],page:1,total:0,pages:0};
  const page=Math.max(1,input.page||1),size=24;
  const {data:campaign}=await db.from("comun_archive_identification_campaigns")
    .select("id,slug,title,public_summary,public_notice,state")
    .eq("slug","memorias-de-volta-redonda-em-identificacao").eq("state","open").maybeSingle();
  if(!campaign)return {campaign:null,items:[],page,total:0,pages:0};
  let query=db.from("comun_archive_identification_items").select(publicItemFields,{count:"exact"})
    .eq("campaign_id",campaign.id).in("display_state",["open","restoration_required"])
    .order("position").range((page-1)*size,page*size-1);
  if(input.state&&["unidentified","has_clues","under_review","partially_identified","identified","disputed"].includes(input.state))query=query.eq("research_state",input.state);
  const term=(input.q||"").replace(/[%_,()]/g," ").trim().slice(0,80);
  if(term)query=query.or(`public_title.ilike.%${term}%,public_prompt.ilike.%${term}%`);
  const {data,count}=await query;
  return {campaign,items:data??[],page,total:count??0,pages:Math.ceil((count??0)/size)};
}

export async function getIdentificationItem(slug:string){
  const db=createServiceSupabaseClient();if(!db)return null;
  const {data:item}=await db.from("comun_archive_identification_items")
    .select(`${publicItemFields},campaign:comun_archive_identification_campaigns!inner(id,slug,title,public_notice,state)`)
    .eq("public_slug",slug).eq("campaign.state","open").in("display_state",["open","restoration_required"]).maybeSingle();
  if(!item)return null;
  const [{data:comments},{data:summary}]=await Promise.all([
    db.from("comun_archive_item_suggestions").select(publicCommentFields)
      .eq("archive_item_id",(await db.from("comun_archive_identification_items").select("archive_item_id").eq("id",item.id).single()).data?.archive_item_id)
      .or("publication_status.eq.approved_public,status.eq.withdrawn").order("created_at"),
    db.from("comun_archive_identification_summaries").select("confirmed_text,open_questions_text,disagreement_text,published_at")
      .eq("identification_item_id",item.id).eq("status","published").maybeSingle(),
  ]);
  return {item,comments:comments??[],summary};
}

export async function listMyIdentificationContributions(userId:string){
  const db=createServiceSupabaseClient();if(!db)return [];
  const {data}=await db.from("comun_archive_item_suggestions")
    .select("id,archive_item_id,status,publication_status,suggestion_type,created_at,archive_item:comun_archive_items(title)")
    .eq("member_user_id",userId).order("created_at",{ascending:false}).limit(50);
  const rows=data??[],ids=rows.map((x:any)=>x.archive_item_id);
  const {data:items}=ids.length?await db.from("comun_archive_identification_items").select("archive_item_id,public_slug").in("archive_item_id",ids):{data:[]};
  const slugByItem=new Map((items??[]).map((x:any)=>[x.archive_item_id,x.public_slug]));
  return rows.map((x:any)=>({...x,public_slug:slugByItem.get(x.archive_item_id)}));
}

export async function listIdentificationModerationQueue(){
  const db=createServiceSupabaseClient();if(!db)return [];
  const {data}=await db.from("comun_archive_item_suggestions")
    .select("id,archive_item_id,parent_id,suggestion_type,suggestion_text,public_text,display_name_snapshot,status,publication_status,risk_level,source_reference,created_at,archive_item:comun_archive_items(title,slug)")
    .not("member_user_id","is",null).in("status",["pending","research","needs_information"])
    .order("risk_level",{ascending:false}).order("created_at").limit(100);
  return data??[];
}
