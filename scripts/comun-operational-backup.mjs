import {createHash} from "node:crypto";
export function stableJson(value){return JSON.stringify(value,Object.keys(value).sort(),2)}
export function checksum(value){return createHash("sha256").update(JSON.stringify(value)).digest("hex")}
export function createBackup(rows){const data=rows.map(({private_contact,internal_note,...safe})=>safe);return {format:"comun-operational-v1",created_at:new Date().toISOString(),count:data.length,checksum:checksum(data),data}}
export function validateBackup(backup){return backup?.format==="comun-operational-v1"&&backup.count===backup.data?.length&&backup.checksum===checksum(backup.data)}
export function exportPauta(rows){return rows.map(({id,queue,state,title,public_reason,next_action})=>({id,queue,state,title,public_reason:public_reason??null,next_action:next_action??null}))}
