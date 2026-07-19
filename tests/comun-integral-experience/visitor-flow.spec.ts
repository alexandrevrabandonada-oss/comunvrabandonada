import { readFile } from "node:fs/promises";
import { expect,test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const password="comun-primeira-participacao-34-2";
async function noCritical(page:any){const audit=await new AxeBuilder({page}).analyze();expect(audit.violations.filter((x:any)=>["serious","critical"].includes(x.impact??""))).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)}
test("novo visitante conclui primeira participação e retorna à pauta",async({page},testInfo)=>{
  const {slug}=JSON.parse(await readFile(".comun-sidewalk-pilot-slug","utf8"));
  const email=`s34-2-${testInfo.project.name}@comun.test`;
  await page.goto("/comun");await expect(page.getByRole("heading",{name:/Organize seu território/})).toBeVisible();
  await page.goto("/comun/territorios");await expect(page.locator("h1")).toBeVisible();
  await page.goto("/comun/comunidades");await expect(page.getByRole("heading",{name:"Comunidades"})).toBeVisible();
  await page.goto(`/comun/pautas/${slug}`);await expect(page.locator("h1")).toContainText(/calçada/i);
  await page.getByRole("link",{name:"Registrar problema"}).click();await expect(page).toHaveURL(/\/comun\/entrar\?returnTo=/);
  await page.getByRole("link",{name:/Criar conta/i}).click();await page.getByLabel("Nome de exibição").fill("Pessoa fixture 34.2");await page.getByLabel("E-mail").fill(email);await page.getByLabel("Senha",{exact:true}).fill(password);await page.getByLabel("Confirmar senha").fill(password);await page.getByLabel(/Aceito os termos/).check();await page.getByLabel(/política de privacidade/).check();await page.getByRole("button",{name:"Criar conta"}).click();
  await expect(page).toHaveURL(/\/comun\/onboarding\?returnTo=/);await expect(page.getByRole("heading",{name:"Seu território"})).toBeVisible();await noCritical(page);await page.screenshot({path:`reports/screenshots/sprint-34-2-onboarding-${testInfo.project.name}.png`,fullPage:true});
  await page.getByRole("button",{name:/Salvar território e continuar/}).click();await expect(page).toHaveURL(/\/comun\/mapa\/contribuir\?origem=calcadas/);
  await page.setInputFiles('input[name="photo"]',".local/comun-integral/calcada-fixture.jpg");await page.getByRole("button",{name:"Continuar"}).click();await page.getByLabel("Bairro ou referência pública").fill("Centro, trecho sintético");await page.getByRole("button",{name:"Continuar"}).click();await page.getByLabel("Impacto").selectOption("high");await page.getByLabel("Descrição curta").fill("Trecho sintético com piso irregular e risco de queda durante o teste local.");await page.getByRole("button",{name:"Continuar"}).click();await noCritical(page);await page.screenshot({path:`reports/screenshots/sprint-34-2-revisao-${testInfo.project.name}.png`,fullPage:true});
  await page.getByRole("button",{name:/Enviar contribuição/}).click();await expect(page.getByRole("heading",{name:/registro está em revisão/})).toBeVisible();await noCritical(page);await page.screenshot({path:`reports/screenshots/sprint-34-2-confirmacao-${testInfo.project.name}.png`,fullPage:true});
  await page.getByRole("link",{name:"Ver em Minha área"}).click();await expect(page.getByRole("heading",{name:"Minha área"})).toBeVisible();await expect(page.getByText(/calçada/i).first()).toBeVisible();await noCritical(page);await page.screenshot({path:`reports/screenshots/sprint-34-2-minha-area-${testInfo.project.name}.png`,fullPage:true});
  await page.getByRole("link",{name:"Voltar à pauta"}).click();await expect(page).toHaveURL(new RegExp(`/comun/pautas/${slug}`));await expect(page.getByText(/O que aprendemos sobre as calçadas/i).first()).toBeVisible();
});
test("retorno hostil é rejeitado",async({page})=>{await page.goto("/comun/criar-conta?returnTo=https%3A%2F%2Fevil.example");await expect(page.locator('input[name="returnTo"]')).toHaveValue("/comun/minha-participacao")});
