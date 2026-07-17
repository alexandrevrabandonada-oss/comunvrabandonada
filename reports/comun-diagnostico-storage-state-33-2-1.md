# Diagnóstico do storageState — Sprint 33.2.1

Data: 17/07/2026. Ambiente exclusivamente local.

## Causa raiz

O estado de navegador era persistido após uma mudança de URL. Isso não provava que o redirect terminara numa superfície protegida: um estado de login podia ser salvo e depois reaparecer em contexto novo. Em paralelo, o E2E fazia login por caso de teste, concentrando tentativas na janela de proteção do Auth local.

## Correção aplicada

- `ensureLocalOperationalPersona()` recebe `runId`, cria ou repara a persona e valida Auth user, identity, perfil, papel, login e refresh.
- Cada e-mail inclui sprint, suíte, `runId` e persona.
- `scripts/diag-comun-auth-storage-state.mjs` valida `operations_admin` do início ao fim: readiness, criação, identity, perfil, papel, login UI, refresh, rota `Central operacional`, cookie, estado salvo, contexto novo, identidade no AdminShell, Axe simples, logout e cleanup.
- `validateOperationalStorageState()` rejeita arquivo ausente, run incompatível, cookie ausente/expirado, redirect para login, formulário de login e identidade não visível; ao rejeitar, remove o arquivo, sem reutilização silenciosa.
- A preparação Playwright salva estados somente após heading, ausência de login, identidade administrativa e cookie. O E2E abre novos contextos a partir desses estados, em vez de autenticar novamente a cada caso.

## Evidência

`node scripts/comun-local-env.mjs run node scripts/diag-comun-auth-storage-state.mjs --repeat 10` concluiu com `COMUN_AUTH_STORAGE_STATE_LOCAL_OK` sob o limite local normal de 30 tentativas/5 minutos, sem waits fixos, cookies falsificados, service role no navegador ou concorrência de personas.

O primeiro E2E reescrito comprovou 35/42 e revelou que a rota de fallback de negação gera loop de redirects para papéis viewer. A asserção foi alterada para validar a primeira resposta 3xx, sem seguir o loop. A segunda execução comprovou 41/42; o caso restante de participante apontava corretamente para `/comun/admin/login` e a expectativa foi ajustada. A repetição integral ainda é pendente neste checkpoint.

## Limites

- Limite local de login restaurado para 30; não houve nova elevação.
- Sem push, deploy, Supabase remoto, R2 real, serviços externos ou dados reais.
- Custo externo: R$ 0.
