import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { cleanupOperationalPerformanceScenario, createOperationalPerformanceScenario } from "../fixtures/comun/operational-performance-scenario.mjs";
import { operationalPassword } from "../fixtures/comun/operational-personas.mjs";

const base=process.env.COMUN_BASE_URL??"http://127.0.0.1:3000";
function personas(){const manifest=JSON.parse(readFileSync(".local/comun-auth/current.json","utf8"));const operations=manifest.personas.find(({persona})=>persona==="operations_admin");const reviewer=manifest.personas.find(({persona})=>persona==="contribution_reviewer");if(!operations||!reviewer)throw new Error("personas operacionais ausentes");return{operations,reviewer};}
async function open(browser,path){const {operations}=personas();const context=await browser.newContext();const page=await context.newPage();await page.goto(new URL(`/comun/admin/login?redirectTo=${encodeURIComponent(path)}`,base).toString());await page.getByLabel("E-mail").fill(operations.email);await page.getByLabel("Senha").fill(operationalPassword);await Promise.all([page.waitForURL(url=>url.pathname==="/comun/admin/operacao"),page.getByRole("button",{name:"Entrar"}).click()]);return{context,page};}

test("central pagina 100 itens no servidor e preserva recorte",async({browser})=>{
  const runId=`pagination-${Date.now()}`;
  try{
    const {operations,reviewer}=personas(); await createOperationalPerformanceScenario({runId,itemCount:100,personas:[{persona:"operations_admin",email:operations.email},{persona:"contribution_reviewer",email:reviewer.email}]});
    const {context,page}=await open(browser,"/comun/admin/operacao?page=1&pageSize=20&sort=urgent");
    try{
      await expect(page.getByRole("heading",{name:"Central operacional"})).toBeVisible();
      const first=await page.locator('a[href^="/comun/admin/operacao/"]').allTextContents();
      expect(first).toHaveLength(20); expect((await page.content()).match(/Carga pagination-/g)?.length??0).toBe(20);
      await page.getByRole("link",{name:"Próxima página"}).click(); await expect(page).toHaveURL(/page=2/);
      const second=await page.locator('a[href^="/comun/admin/operacao/"]').allTextContents(); expect(second).toHaveLength(20); expect(second.some(item=>first.includes(item))).toBe(false);
      await page.getByLabel("Sem responsável").check(); await page.getByRole("button",{name:"Aplicar filtros"}).click(); await expect(page).toHaveURL(/unassigned=1/); await expect(page.locator('a[href^="/comun/admin/operacao/"]')).toHaveCount(20);
      await page.getByRole("link",{name:"Limpar filtros"}).first().click(); await expect(page).toHaveURL(/\/comun\/admin\/operacao$/);
      await page.getByLabel("Busca segura").fill("item 001"); await page.getByRole("button",{name:"Aplicar filtros"}).click(); await expect(page.locator('a[href^="/comun/admin/operacao/"]')).toHaveCount(1);
      const detail=page.locator('a[href^="/comun/admin/operacao/"]').first(); await detail.click(); await page.getByRole("link",{name:"Voltar ao mesmo recorte da fila"}).click(); await expect(page).toHaveURL(/search=item/); await expect(page.locator('a[href^="/comun/admin/operacao/"]')).toHaveCount(1);
    }finally{await context.close();}
  }finally{await cleanupOperationalPerformanceScenario({runId});}
});

test("@a11y paginação e filtros móveis permanecem acessíveis",async({browser})=>{
  const {context,page}=await open(browser,"/comun/admin/operacao?page=999&pageSize=100");
  try{await page.setViewportSize({width:390,height:844});await expect(page.getByText(/Página 1 de 1/)).toBeVisible();await page.getByText("Abrir filtros e ordenação").click();await expect(page.getByLabel("Busca segura")).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}finally{await context.close();}
});
