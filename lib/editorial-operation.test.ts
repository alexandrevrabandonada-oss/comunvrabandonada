import {describe,expect,it} from "vitest";
import {canOperate,canTransition,indicativeDueHours,participantMessage,sanitizeOperationalPayload} from "./editorial-operation";
describe("operação editorial",()=>{
 it("separa capacidades",()=>{expect(canOperate("factual_reviewer","factual")).toBe(true);expect(canOperate("factual_reviewer","publication")).toBe(false);expect(canOperate("viewer","entry")).toBe(false)});
 it("mantém transições humanas",()=>{expect(canTransition("in_review","ready")).toBe(true);expect(canTransition("pending","published")).toBe(false)});
 it("sanitiza recursivamente",()=>expect(sanitizeOperationalPayload({title:"x",nested:{private_contact:"a",ok:1},tokens:[{secret:"x",safe:true}]})).toEqual({title:"x",nested:{ok:1},tokens:[{safe:true}]}));
 it("define prazo indicativo e mensagem",()=>{expect(indicativeDueHours("withdrawals")).toBe(24);expect(participantMessage("pending")).toContain("triagem humana")});
});
