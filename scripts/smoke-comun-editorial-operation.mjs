import assert from "node:assert/strict";
import { OPERATION_QUEUES, canOperate, canTransition, participantMessage, sanitizeOperationalPayload } from "../lib/editorial-operation.ts";

const items=[]; const events=[];
const add=(queue,index)=>items.push({id:`fixture-s33-${index}`,queue,state:"pending",title:`Cenário sintético ${index}`,private_contact:"fixture@example.invalid"});
for(let i=0;i<100;i++) add(OPERATION_QUEUES[i%OPERATION_QUEUES.length],i);
const steps=[
 ()=>assert.equal(items.length,100), ()=>assert.equal(new Set(items.map(x=>x.queue)).size,10),
 ()=>assert(canOperate("editor","triage")), ()=>assert(!canOperate("viewer","triage")),
 ()=>assert(!canOperate("factual_reviewer","publication")), ()=>assert(canOperate("publisher","publication")),
 ()=>assert(canTransition("pending","assigned")), ()=>assert(!canTransition("pending","published")),
 ()=>{items[0].state="assigned"}, ()=>{items[0].state="in_review"}, ()=>{items[0].state="ready"}, ()=>{items[0].state="published"},
 ()=>assert(participantMessage("pending").includes("humana")), ()=>assert(participantMessage("withdrawn").includes("retirado")),
 ()=>assert.deepEqual(sanitizeOperationalPayload(items[0]),{id:items[0].id,queue:items[0].queue,state:items[0].state,title:items[0].title}),
 ()=>events.push({type:"assigned",payload:{safe:true,internal_note:"omit"}}), ()=>assert.deepEqual(sanitizeOperationalPayload(events[0]),{type:"assigned",payload:{safe:true}}),
 ()=>assert.equal(items.filter(x=>x.queue==="withdrawals").length,10), ()=>assert.equal(items.filter(x=>x.queue==="corrections").length,10),
 ()=>assert(OPERATION_QUEUES.every(q=>items.some(x=>x.queue===q))), ()=>assert.equal(items.filter(x=>x.state==="published").length,1),
 ()=>{items[1].state="blocked"}, ()=>assert(canTransition("blocked","assigned")), ()=>{items[1].state="assigned"},
 ()=>assert(items.every(x=>x.id.startsWith("fixture-s33-"))), ()=>{items.length=0;events.length=0}
];
steps.forEach((step,index)=>{step(); process.stdout.write(`PASS ${String(index+1).padStart(2,"0")}\n`)});
assert.equal(items.length,0); assert.equal(events.length,0);
console.log("COMUN_EDITORIAL_OPERATION_LOCAL_OK");
console.log("COMUN_TEST_FIXTURES_CLEAN");
