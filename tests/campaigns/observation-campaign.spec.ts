import{expect,test}from'@playwright/test';
test('rota pública de campanha inexistente não vaza dados',async({page})=>{const response=await page.goto('/comun/observatorios/onibus-em-movimento/campanhas/inexistente');expect(response?.status()).toBe(404);expect(await page.content()).not.toContain('private_contact')});
test('@a11y modo de campo é protegido',async({page})=>{await page.goto('/comun/observatorios/onibus-em-movimento/campo/campanha-inexistente');await expect(page).toHaveURL(/\/comun\/admin\/login|campo/)});
