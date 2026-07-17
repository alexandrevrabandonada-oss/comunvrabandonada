import AxeBuilder from "@axe-core/playwright";
import {expect,test,type Page} from "@playwright/test";
import {OPERATIONAL_SURFACES} from "../../lib/operational-surfaces";
// @ts-expect-error fixture ESM local.
import {operationalEmail,operationalPassword} from "../fixtures/comun/operational-personas.mjs";
// @ts-expect-error helper ESM local.
import {localServiceClient} from "../fixtures/comun/local-fixtures.mjs";

let itemId="";
test.beforeAll(async()=>{
  const db=localServiceClient();
  const{data,error}=await db.from("comun_editorial_operation_items").insert({source_type:"contribution",queue:"withdrawals",title:"Retirada urgente sintética",next_action:"Conter publicação",human_gate:"Confirmação humana",fixture_tag:"fixture-s33-2-1"}).select("id").single();
  if(error)throw error;itemId=data.id;
});
test.afterAll(async()=>{const db=localServiceClient();await db.from("comun_editorial_operation_items").delete().eq("fixture_tag","fixture-s33-2-1")});

async function login(page:Page,persona:string,redirectTo:string){
  await page.context().clearCookies();
  await page.goto(`/comun/admin/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  await page.getByLabel("E-mail").fill(operationalEmail(persona));
  await page.getByLabel("Senha").fill(operationalPassword);
  await page.getByRole("button",{name:"Entrar"}).click();
}
async function assertAccessible(page:Page){
  await expect(page.getByLabel("E-mail")).toHaveCount(0);
  const result=await new AxeBuilder({page}).analyze();
  expect(result.violations.filter(({impact})=>impact==="serious"||impact==="critical")).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}
const surfacesByRole=Object.entries(Object.groupBy(OPERATIONAL_SURFACES.filter(({key})=>key!=="expired"),({role})=>role));

test("@a11y central e detalhe em todos os viewports",async({page})=>{
  await login(page,"operations_admin","/comun/admin/operacao");
  for(const path of["/comun/admin/operacao",`/comun/admin/operacao/${itemId}`]){await page.goto(path);await assertAccessible(page)}
});

test("@visual central e detalhe em todos os viewports",async({page},info)=>{
  await login(page,"operations_admin","/comun/admin/operacao");
  await assertAccessible(page);
  await page.screenshot({path:`reports/screenshots/sprint-33-2-1-central-${info.project.name}.png`,fullPage:true});
  await page.goto(`/comun/admin/operacao/${itemId}`);await assertAccessible(page);
  await page.screenshot({path:`reports/screenshots/sprint-33-2-1-detail-${info.project.name}.png`,fullPage:true});
});

test("@a11y superfícies especializadas com persona correta",async({page},info)=>{
  if(!["360x800","1366x768"].includes(info.project.name))return;
  for(const [role,surfaces] of surfacesByRole){const first=surfaces![0];await login(page,role,`/comun/admin/operacao/superficies/${first.key}`);for(const surface of surfaces!){await page.goto(`/comun/admin/operacao/superficies/${surface.key}`);await expect(page.getByRole("heading",{name:surface.title})).toBeVisible();await assertAccessible(page)}}
});

test("@visual superfícies especializadas com persona correta",async({page},info)=>{
  if(!["360x800","1366x768"].includes(info.project.name))return;
  for(const [role,surfaces] of surfacesByRole){const first=surfaces![0];await login(page,role,`/comun/admin/operacao/superficies/${first.key}`);for(const surface of surfaces!){await page.goto(`/comun/admin/operacao/superficies/${surface.key}`);await assertAccessible(page);await page.screenshot({path:`reports/screenshots/sprint-33-2-1-${surface.key}-${info.project.name}.png`,fullPage:true})}}
});

test("@a11y @visual sessão expirada não revela superfície protegida",async({page},info)=>{
  if(!["360x800","1366x768"].includes(info.project.name))return;
  await login(page,"operations_admin","/comun/admin/operacao");await page.context().clearCookies();
  await page.goto("/comun/admin/operacao/superficies/expired");
  await expect(page).toHaveURL(/\/comun\/admin\/login/);expect(await page.content()).not.toContain("Item fixture");
  await assertAccessible(page);
  await page.screenshot({path:`reports/screenshots/sprint-33-2-1-expired-${info.project.name}.png`,fullPage:true});
});
