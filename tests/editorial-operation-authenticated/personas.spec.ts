import {expect,test,type Page} from "@playwright/test";
import {OPERATIONAL_SURFACES} from "../../lib/operational-surfaces";
// @ts-expect-error fixture ESM executável local.
import {operationalEmail,operationalPassword,operationalPersonas} from "../fixtures/comun/operational-personas.mjs";

async function login(page:Page,persona:string,redirectTo="/comun/admin/operacao"){
  await page.goto(`/comun/admin/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  await page.getByLabel("E-mail").fill(operationalEmail(persona));
  await page.getByLabel("Senha").fill(operationalPassword);
  await page.getByRole("button",{name:"Entrar"}).click();
}

for(const surface of OPERATIONAL_SURFACES.filter(({key})=>key!=="expired")){
  test(`${surface.role}: abre ${surface.key} com o papel mínimo`,async({page})=>{
    const path=`/comun/admin/operacao/superficies/${surface.key}`;
    await login(page,surface.role,path);
    await expect(page).toHaveURL(new RegExp(`${surface.key}$`));
    await expect(page.getByRole("heading",{name:surface.title})).toBeVisible();
    await expect(page.locator("main")).toHaveAttribute("data-operational-surface",surface.key);
    await expect(page.getByRole("button",{name:surface.action})).toBeVisible();
  });
}

const denials=[
  ["privacy_reviewer","art-rights"],
  ["rights_reviewer","privacy"],
  ["facilitator","queue"],
  ["protocol_operator","media"],
  ["result_editor","assignment"],
  ["art_editor","radio-rights"],
  ["radio_editor","art-rights"],
  ["participant","audit"],
] as const;

for(const [persona,surface] of denials){
  test(`${persona}: negação fechada em ${surface}`,async({page})=>{
    const path=`/comun/admin/operacao/superficies/${surface}`;
    await login(page,persona,path);
    expect(new URL(page.url()).pathname).not.toBe(path);
    const html=await page.content();
    expect(html).not.toContain("Item fixture");
    expect(html).not.toContain("Conteúdo sensível oculto");
  });
}

test("sessão expirada volta ao login sem conteúdo protegido",async({page,context})=>{
  await login(page,"operations_admin","/comun/admin/operacao");
  await context.clearCookies();
  await page.goto("/comun/admin/operacao/superficies/expired");
  await expect(page).toHaveURL(/\/comun\/admin\/login/);
  expect(await page.content()).not.toContain("Item fixture");
});

for(const persona of Object.keys(operationalPersonas)){
  test(`${persona}: sessão é isolada depois do logout local`,async({page,context})=>{
    await login(page,persona);
    await context.clearCookies();
    await page.goto("/comun/admin/operacao");
    await expect(page).toHaveURL(/\/comun\/admin\/login/);
  });
}

test("visitante é negado",async({page})=>{await page.goto("/comun/admin/operacao");await expect(page).toHaveURL(/\/comun\/admin\/login/)});
