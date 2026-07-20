export const COMMENT_LIMITS={hour:5,day:30} as const;
export function identificationRisk(type:string,body:string){return ["person_information","photographer_information"].includes(type)||/\b(menor|criança|acus|crime|cpf|telefone|endereço)\b/i.test(body)?"high":"normal"}
export function canReplyTo(parent:{parent_id:string|null;status:string;publication_status:string;archive_item_id:string}|null,itemId:string){return Boolean(parent&&!parent.parent_id&&parent.archive_item_id===itemId&&parent.status==="approved"&&parent.publication_status==="approved_public")}
export function shouldHideOnReport(reason:string){return ["personal_data","offensive_content","copyright"].includes(reason)}
export function canOpenIdentificationCampaign(input:{total:number;ready:number;restoration:number;pending:number}){return input.total===860&&input.ready+input.restoration===input.total&&input.pending===0}
