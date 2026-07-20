export const OPERATION_QUEUES = ["entry","triage","rights","safety","factual","editorial","publication","follow_up","corrections","withdrawals"] as const;
export type OperationQueue = typeof OPERATION_QUEUES[number];
export type OperationRole = "admin"|"editor"|"factual_reviewer"|"editorial_reviewer"|"publisher"|"viewer";

export const QUEUE_LABELS: Record<OperationQueue,string> = {entry:"Entrada",triage:"Triagem",rights:"Direitos",safety:"Segurança",factual:"Revisão factual",editorial:"Revisão editorial",publication:"Publicação",follow_up:"Acompanhamento",corrections:"Correções",withdrawals:"Retiradas"};
export const ROLE_QUEUES: Record<OperationRole,readonly OperationQueue[]> = {
  admin: OPERATION_QUEUES, editor:["entry","triage","rights","safety","editorial","corrections","withdrawals"],
  factual_reviewer:["factual"], editorial_reviewer:["editorial"], publisher:["publication","follow_up"], viewer:[]
};
export const TRANSITIONS: Record<string,readonly string[]> = {pending:["assigned","blocked"],assigned:["in_review","blocked"],in_review:["blocked","ready"],blocked:["assigned"],ready:["published","resolved"],published:["corrections","withdrawn"],resolved:["assigned"],withdrawn:[]};

const PRIVATE_KEY = /(contact|email|phone|token|secret|password|private|precise|coordinate|document|original|storage|internal|note)/i;
export function sanitizeOperationalPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeOperationalPayload);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key])=>!PRIVATE_KEY.test(key)).map(([key,item])=>[key,sanitizeOperationalPayload(item)]));
  return value;
}
export function canOperate(role: OperationRole, queue: OperationQueue){ return ROLE_QUEUES[role].includes(queue); }
export function canTransition(from:string,to:string){ return TRANSITIONS[from]?.includes(to) ?? false; }
export function indicativeDueHours(queue:OperationQueue){ return ({entry:24,triage:48,rights:120,safety:24,factual:96,editorial:96,publication:48,follow_up:168,corrections:72,withdrawals:24} as const)[queue]; }
export function participantMessage(state:string){ return ({pending:"Recebemos sua participação. Ela aguarda triagem humana.",in_review:"A equipe está revisando sua participação.",blocked:"A análise precisa de informação ou cuidado adicional.",published:"A contribuição aprovada já integra a pauta.",resolved:"O acompanhamento foi concluído.",withdrawn:"O conteúdo foi retirado; o histórico privado foi preservado."} as Record<string,string>)[state] ?? "O estado será atualizado após análise humana."; }
