import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { cleanupOperationalPerformanceScenario, createOperationalPerformanceScenario } from "../fixtures/comun/operational-performance-scenario.mjs";

const base=process.env.COMUN_BASE_URL??"http://127.0.0.1:3000";
async function assertAxe(page){const result=await new AxeBuilder({page}).analyze();expect(result.violations.filter(({impact})=>impact==="serious"||impact==="critical")).toEqual([]);}
function personas(){const manifest=JSON.parse(readFileSync(".local/comun-auth/current.json","utf8"));const operations=manifest.personas.find(({persona})=>persona==="operations_admin");if(!operations)throw new Error("persona operations_admin ausente");return{operations,reviewer:operations};}
async function open(browser,path){const {operations}=personas();const context=await browser.newContext({storageState:operations.state});const page=await context.newPage();await page.goto(new URL(path,base).toString());return{context,page};}

test("central pagina 100 itens no servidor e preserva recorte",async({browser})=>{
  const runId=`pagination-${Date.now()}`;
  try{
    const {operations,reviewer}=personas(); await createOperationalPerformanceScenario({runId,itemCount:100,personas:[{persona:"operations_admin",email:operations.email},{persona:"contribution_reviewer",email:reviewer.email}]});
    const {context,page}=await open(browser,"/comun/admin/operacao?page=1&pageSize=20&sort=urgent");
    try{
      await expect(page.getByRole("heading",{name:"Central operacional"})).toBeVisible(); await assertAxe(page);
      const first=await page.locator('a[href^="/comun/admin/operacao/"]').allTextContents();
      expect(first).toHaveLength(20); expect((await page.content()).match(/Carga pagination-/g)?.length??0).toBeLessThan(100);
      await page.getByRole("link",{name:"Próxima página"}).click(); await expect(page).toHaveURL(/page=2/);
      const second=await page.locator('a[href^="/comun/admin/operacao/"]').allTextContents(); expect(second).toHaveLength(20); expect(second.some(item=>first.includes(item))).toBe(false);
      const filters=page.getByLabel("Filtros server-side"); await filters.getByLabel("Sem responsável").check(); await filters.getByRole("button",{name:"Aplicar filtros"}).click(); await expect(page).toHaveURL(/unassigned=1/); await expect(page.locator('a[href^="/comun/admin/operacao/"]')).toHaveCount(20);
      await page.getByRole("link",{name:"Limpar filtros"}).first().click(); await expect(page).toHaveURL(/\/comun\/admin\/operacao$/);
      await filters.getByLabel("Busca segura").fill("item 001"); await filters.getByRole("button",{name:"Aplicar filtros"}).click(); await expect(page.locator('a[href^="/comun/admin/operacao/"]')).toHaveCount(1);
      const detail=page.locator('a[href^="/comun/admin/operacao/"]').first(); await detail.click(); await page.getByRole("link",{name:"Voltar ao mesmo recorte da fila"}).click(); await expect(page).toHaveURL(/search=item/); await expect(page.locator('a[href^="/comun/admin/operacao/"]')).toHaveCount(1);
    }finally{await context.close();}
  }finally{await cleanupOperationalPerformanceScenario({runId});}
});

test("@a11y paginação e filtros móveis permanecem acessíveis",async({browser})=>{
  const {context,page}=await open(browser,"/comun/admin/operacao?page=999&pageSize=100");
  try{await page.setViewportSize({width:390,height:844});await expect(page.getByText(/Página 1 de 1/)).toBeVisible();await page.getByText("Abrir filtros e ordenação").click();await expect(page.locator("details").getByLabel("Busca segura")).toBeVisible();await assertAxe(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}finally{await context.close();}
});

test("participant e visitante não recebem a central nem itens da fila",async({browser})=>{
  const manifest=JSON.parse(readFileSync(".local/comun-auth/current.json","utf8"));const participant=manifest.personas.find(({persona})=>persona==="participant");if(!participant)throw new Error("persona participant ausente");
  for(const state of [participant.state,undefined]){const context=await browser.newContext(state?{storageState:state}:{});try{const response=await context.request.get(new URL("/comun/admin/operacao?page=2&pageSize=20",base).toString(),{maxRedirects:0});expect(response.status()).toBeGreaterThanOrEqual(300);expect(response.status()).toBeLessThan(400);const body=await response.text();expect(body).not.toContain("Central operacional");expect(body).not.toContain("Carga pagination-");}finally{await context.close();}}
});
