import { describe, expect, it } from "vitest";
import { MAX_PAGE_SIZE, normalizeOperationalQuery, operationalQueryHref } from "@/lib/operational-queue";

describe("operational queue query", () => {
  it("normaliza página e limita pageSize", () => {
    const query=normalizeOperationalQuery({page:"-9",pageSize:"999"});
    expect(query.page).toBe(1); expect(query.pageSize).toBe(MAX_PAGE_SIZE);
  });
  it("aceita somente filtros e ordenação permitidos", () => {
    const query=normalizeOperationalQuery({queue:"withdrawals",status:"blocked",priority:"1",dueState:"overdue",type:"photo",sort:"deadline",search:"  retirada  "});
    expect(query).toMatchObject({queue:"withdrawals",status:"blocked",priority:1,dueState:"overdue",sourceType:"photo",sort:"deadline",search:"retirada"});
  });
  it("descarta parâmetros fora do contrato", () => {
    const query=normalizeOperationalQuery({queue:"privada",status:"secret",priority:"8",sort:"opaque",assignedTo:"not-a-uuid",search:"x".repeat(160)});
    expect(query.queue).toBeUndefined(); expect(query.status).toBeUndefined(); expect(query.priority).toBeUndefined(); expect(query.sort).toBe("urgent"); expect(query.assignedTo).toBeUndefined(); expect(query.search).toHaveLength(120);
  });
  it("serializa URL retomável e reinicia página quando solicitado", () => {
    const query=normalizeOperationalQuery({page:"3",queue:"rights",sort:"oldest",pageSize:"20"});
    expect(operationalQueryHref(query,{page:1})).toBe("/comun/admin/operacao?page=1&pageSize=20&queue=rights&sort=oldest");
  });
});
