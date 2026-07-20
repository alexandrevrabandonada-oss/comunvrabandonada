import { describe,expect,it } from "vitest";
import { filterCommunityExperiences,getCommunityExperience,listCommunityExperiences } from "./community-experience";
describe("comunidades vivas",()=>{
 it("toda comunidade responde propósito e próxima ação",()=>{for(const x of listCommunityExperiences()){expect(x.purpose.length).toBeGreaterThan(30);expect(x.nextAction.length).toBeGreaterThan(15);expect(x.governance.roles.length).toBeGreaterThan(0)}});
 it("filtra sem popularidade",()=>{expect(filterCommunityExperiences(listCommunityExperiences(),"calçada","","",false).map(x=>x.slug)).toEqual(["cidade"]);expect(filterCommunityExperiences(listCommunityExperiences(),"","territorial","",false).every(x=>x.kind==="territorial")).toBe(true)});
 it("grupos possuem objetivo ciclo e resultado",()=>{for(const x of listCommunityExperiences())for(const group of x.workingGroups)expect(group).toMatchObject({objective:expect.any(String),cycle:expect.any(String),result:expect.any(String)})});
 it("não expõe membros nem métricas sociais",()=>{expect(JSON.stringify(getCommunityExperience("trabalho"))).not.toMatch(/followers|likes|memberCount|seguidores/i)});
});
