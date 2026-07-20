# Checkpoint — Sprint 37.1

Data: 19/07/2026.

## Git e ambiente

- worktree: `C:\Projetos\comun-familiaridade-local`;
- branch: `codex/comun-familiaridade-local`;
- HEAD inicial: `3175929` (`design: propõe conceitos de familiaridade da candidata`);
- status inicial: limpo;
- processo Next inicial: nenhum processo iniciado por esta sprint;
- execução autorizada: somente local.

## Superfícies e arquitetura

- shell: `components/comun-app-shell.tsx` e `components/comun-shell.tsx`;
- navegação: `components/comun-navigation.tsx`, cinco destinos principais;
- Home pública/autenticada: `app/comun/page.tsx`;
- comunidades: `app/comun/comunidades/page.tsx` e `app/comun/c/[slug]/page.tsx`;
- pauta e mapa: `components/pauta-app-shell.tsx` e `components/sidewalk-map-module.tsx`;
- Participar: `components/comun-experience-controls.tsx`;
- Minha área: `app/comun/minha-participacao/page.tsx`;
- Inbox: `app/comun/caixa-de-entrada/page.tsx`;
- contribuição/confirmacão: `components/sidewalk-first-participation-form.tsx`, `app/comun/mapa/contribuir/actions.ts` e rota de confirmação.

## Sistema visual inicial

- cores recorrentes: `comun-black`, `comun-paper`, `comun-yellow`, `comun-asphalt`, `comun-concrete`;
- fonte: pilha sans do projeto, herdada pelos controles;
- ícones: Lucide em parte do produto, coexistindo com botões textuais e símbolos próprios;
- bordas predominantemente de 2 px, raios pouco usados, sombras industriais pontuais;
- uso extenso de caixa-alta e amarelo em títulos, labels e ações;
- conceitos aprovados como direção: 18 capturas em `reports/concepts/sprint-37-1/`.

## Qualidade de base

- E2E integrado em desenvolvimento: 15/15;
- unitários: 223/223;
- build e matriz RLS: aprovados na Sprint 37;
- production-like autenticado: falha registrada após envio da contribuição;
- senha inválida: mensagem anterior não atendia ao contrato atual;
- gate humano: 0/3.

## Hipótese funcional inicial

O script local oficial injeta `MEDIA_STORAGE_PROVIDER=supabase-local`, mas a execução manual anterior de `next start` recebeu URL e chaves locais sem esse seletor. Em `NODE_ENV=production`, `getMediaStorage()` usa R2 como padrão; portanto o upload tentou um provedor incompatível com o ensaio local. A hipótese será confirmada contra build/start com logs sanitizados e consulta local.

## Declarações

- Piloto público: **NÃO ABERTO**
- Integração principal: **NÃO EXECUTADA**
- Push: **NÃO EXECUTADO**
- Deploy: **NÃO EXECUTADO**
- Supabase remoto: **NÃO ALTERADO**
- R2 real: **NÃO UTILIZADO**
- Dados reais: **NÃO UTILIZADOS**
- Custo externo: **R$ 0**

## Fechamento técnico

A hipótese funcional foi confirmada: o wrapper local oficial seleciona `supabase-local`, enquanto a execução manual anterior deixava o modo de produção cair no padrão R2. O fluxo foi corrigido e validado em `next start`. Build, lint, tipos, 227 testes unitários, autenticação local, limpeza de fixtures e a matriz production-like equivalente a 15/15 nos cinco viewports passaram. O gate humano permanece deliberadamente em 0/3; por isso não há promoção para piloto.
