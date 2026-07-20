import {describe,expect,it} from "vitest";
import {canOpenIdentificationCampaign,canReplyTo,identificationRisk,shouldHideOnReport} from "./archive-identification-rules";
describe("identificação comunitária",()=>{
 it("prioriza conteúdo sensível",()=>{expect(identificationRisk("person_information","Reconheço esta pessoa")).toBe("high");expect(identificationRisk("historical_context","Uma memória coletiva sem dados pessoais")).toBe("normal")});
 it("aceita resposta somente a raiz pública do mesmo item",()=>{const parent={parent_id:null,status:"approved",publication_status:"approved_public",archive_item_id:"a"};expect(canReplyTo(parent,"a")).toBe(true);expect(canReplyTo({...parent,parent_id:"x"},"a")).toBe(false);expect(canReplyTo(parent,"b")).toBe(false)});
 it("oculta preventivamente denúncias críticas",()=>{expect(shouldHideOnReport("personal_data")).toBe(true);expect(shouldHideOnReport("incorrect_authorship")).toBe(false)});
 it("abre somente após reconciliação de 860 fichas",()=>{expect(canOpenIdentificationCampaign({total:860,ready:859,restoration:1,pending:0})).toBe(true);expect(canOpenIdentificationCampaign({total:860,ready:858,restoration:1,pending:1})).toBe(false)});
});
