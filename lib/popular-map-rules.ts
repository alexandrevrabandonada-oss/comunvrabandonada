import { z } from "zod";

const position=z.tuple([z.number().min(-180).max(180),z.number().min(-90).max(90)]);
const coordinates=z.union([
 position,
 z.array(position).min(2).max(500),
 z.array(z.array(position).min(4).max(500)).min(1).max(20),
 z.array(z.array(z.array(position).min(4).max(500)).min(1).max(20)).min(1).max(10),
]);
export const safeGeoJsonSchema=z.object({type:z.enum(['Point','LineString','Polygon','MultiPolygon']),coordinates,properties:z.object({}).strict().optional()}).strict();
export function validateSafeGeoJson(input:unknown){const text=JSON.stringify(input);if(text.length>100_000)return{ok:false as const,error:'Geometria excede 100 KB.'};const result=safeGeoJsonSchema.safeParse(input);return result.success?{ok:true as const,value:result.data}:{ok:false as const,error:'GeoJSON inválido ou complexo demais.'}}
export function publicCoordinates(row:{latitude:number|null;longitude:number|null;location_precision:string}){if(row.location_precision==='hidden'||row.latitude==null||row.longitude==null)return null;const digits=row.location_precision==='exact'?5:row.location_precision==='approximate'?3:2;return{latitude:Number(row.latitude.toFixed(digits)),longitude:Number(row.longitude.toFixed(digits)),precision:row.location_precision}}
export const ownershipLabels:Record<string,string>={confirmed_by_official_document:'Titularidade confirmada por documento oficial',attributed_to_company_in_public_source:'Área atribuída à organização conforme fonte pública',possession_or_domain_disputed:'Posse ou domínio em disputa',unverified_community_report:'Relato comunitário ainda não verificado',outdated_information:'Informação possivelmente desatualizada',unknown:'Titularidade desconhecida'};
export function ownershipPublicWording(input:{assertion_type:string;attributed_party_public?:string|null;source_title:string;source_date?:string|null}){const party=input.attributed_party_public?` a ${input.attributed_party_public}`:'';const date=input.source_date?`, de ${new Date(`${input.source_date}T12:00:00Z`).toLocaleDateString('pt-BR')}`:'';if(input.assertion_type==='attributed_to_company_in_public_source')return`Área atribuída${party} conforme ${input.source_title}${date}.`;
if(input.assertion_type==='confirmed_by_official_document')return`Titularidade indicada${party} em ${input.source_title}${date}.`;return`${ownershipLabels[input.assertion_type]??ownershipLabels.unknown}, conforme ${input.source_title}${date}.`}
export function isPublicTerritory(row:{visibility:string;status:string;verification_status:string}){return row.visibility==='public'&&row.status!=='archived'&&row.verification_status!=='unverified'}
export function filterMapItems<T extends {name:string;municipality:string|null;neighborhood:string|null;territory_type:string;verification_status:string;layers?:{slug:string}[];materials?:{slug:string}[]}>(rows:T[],q:string,filters:{front?:string;material?:string;verification?:string}){const needle=q.trim().toLocaleLowerCase('pt-BR');return rows.filter(x=>(!needle||[x.name,x.municipality,x.neighborhood,x.territory_type].some(v=>v?.toLocaleLowerCase('pt-BR').includes(needle)))&&(!filters.front||x.layers?.some(l=>l.slug===filters.front))&&(!filters.material||x.materials?.some(m=>m.slug===filters.material))&&(!filters.verification||x.verification_status===filters.verification))}
