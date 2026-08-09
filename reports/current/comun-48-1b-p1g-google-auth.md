# COMUN 48.1B-P1G — Google Auth

Atualizado em 09/08/2026.

## Estado

- baseline canônico confirmado antes de alterações:
  `origin/main=09ab579b658e3ef1e6964b932ef8faba081e574a`;
- estado inicial confirmado:
  `COMUN_48_1B_P6A_ESSENTIAL_SERVICES_DOMAIN_GREEN_NO_AUTO_SEND`;
- branch nova: `codex/48-1b-p1g-google-auth`;
- nenhum arquivo não rastreado preexistente foi alterado ou incluído;
- nenhuma migration P1G foi criada;
- Production continua com Google oculto e e-mail/senha + navegação anônima
  disponíveis;
- estado terminal P1G ainda não foi emitido.

## Arquitetura preservada

P1G reutiliza exclusivamente Supabase Auth SSR/PKCE. Não há NextAuth/Auth.js,
tabela paralela de identidade, token de provider persistido ou acesso a APIs do
Google.

- ação server-side: `signInWithOAuth({ provider: "google" })`;
- escopos exatos: `openid email profile`;
- callback: `/comun/auth/callback` com `exchangeCodeForSession`;
- Production fixa a origem em `https://comunsocial.online`, mesmo se uma
  variável local estiver incorreta;
- Preview só usa o host HTTPS `.vercel.app` fornecido pelo ambiente Preview;
- `returnTo` aceita somente rotas internas `/comun` não administrativas e
  rejeita URL externa, `javascript:`, protocolo relativo, barra invertida,
  controles e variantes codificadas;
- erro do provider é genérico e não registra código, cookie, token ou e-mail;
- perfis suspensos, em desativação, desativados ou arquivados encerram a sessão
  e falham fechados;
- conta nova ativa vai a `/comun/completar-conta`, com nome sugerido editável,
  aceite de termos/política e visibilidade privada; território não é pedido;
- o vínculo da Carteira anônima continua separado e exige o gesto explícito
  “Vincular esta carteira à minha conta”, auditado como
  `explicit_account_link`.

O comportamento de identidade por e-mail fica a cargo do mecanismo oficial de
identities do Supabase; não existe merge manual por e-mail no COMUN.

## Verificação local sem credencial Google

O E2E `auth:p1g:google:e2e:local` executa a UI real contra um Auth falso apenas
em loopback e interrompe o percurso antes do Google.

- botão Google, e-mail/senha e continuação anônima coexistem;
- URL de autorização contém somente provider, callback seguro e os três
  escopos mínimos;
- não há `offline`, `access_type`, `prompt=consent` ou provider token;
- somente as duas origens loopback foram contatadas;
- callback inválido usa erro genérico e não aceita `evil.example`;
- Axe: zero violações na tela exercitada;
- testes focais de Auth/retorno: 20/20;
- contrato dos workflows: 4/4;
- E2E local: 2/2;
- typecheck e lint: verdes.

## Preflight remoto e migrations

O workflow `comun-p1g-preflight.yml`:

1. confirma por catálogo read-only o estado terminal P6A, sem ler linhas de
   negócio;
2. lê o estado público do provider Auth sem expor credenciais;
3. quando houver token de Management API, reduz a configuração a booleans para
   Site URL, redirect exato, provider, Client ID e Client Secret;
4. reconcilia temporariamente a migration histórica de Calçadas e exige plano
   remoto vazio;
5. proíbe `--include-all`, repair, reset e seed.

Run read-only `31322898529`: verde.

- estado P6A remoto confirmado por metadata;
- nenhuma linha de negócio lida e transação read-only confirmada;
- endpoint público de Auth informava `googleProviderEnabled=false` antes da
  configuração do provider;
- Client ID, Client Secret e provider tokens não foram lidos;
- Management API indisponível porque não há token configurado no ambiente;
- resultado do dry-run reconciliado:
  `COMUN_P1G_REMOTE_MIGRATION_PLAN_EMPTY`, com zero migration, zero
  `--include-all`, repair, reset ou seed.

Run pós-configuração `31325453756`: verde.

- endpoint público confirmou `googleProviderEnabled=true`;
- Client ID, Client Secret e provider tokens continuaram não lidos;
- Management API permaneceu indisponível por ausência do token opcional;
- plano remoto permaneceu vazio e nenhuma linha de negócio foi lida.

## Fontes oficiais atuais

- guia Supabase de login Google:
  https://supabase.com/docs/guides/auth/social-login/auth-google;
- redirect URLs/Site URL:
  https://supabase.com/docs/guides/auth/redirect-urls;
- PKCE server-side:
  https://supabase.com/docs/reference/javascript/auth-signinwithoauth;
- identities e vínculo oficial:
  https://supabase.com/docs/guides/auth/identities;
- endpoint read-only de configuração Auth:
  https://supabase.com/docs/reference/api/v1-get-auth-service-config.

## Configuração Google Cloud e Supabase realizada

Após o aceite humano dos Termos do Google Cloud, foi criado e selecionado o
projeto Google Cloud `COMUN` e configurado o Google Auth Platform para público
externo.

- app OAuth: `COMUN`;
- cliente: Web application, `COMUN Web Production`;
- origem JavaScript: exatamente `https://comunsocial.online`;
- redirect Google: exatamente
  `https://nvmdszymrtacfehdynpg.supabase.co/auth/v1/callback`;
- acesso a dados limitado a `openid`, `userinfo.email` e `userinfo.profile`;
- nenhuma API Google adicional, offline access ou escopo adicional foi
  habilitado;
- nenhum Client ID, Client Secret, e-mail, código, token ou cookie foi escrito
  no repositório, artifact ou relatório.

No Supabase Production, a configuração final foi conferida somente como
metadados e booleans:

- Google provider: habilitado;
- Client ID: configurado;
- Client Secret: configurado;
- Skip nonce: desabilitado;
- contas sem e-mail: desabilitadas;
- Site URL: `https://comunsocial.online`;
- redirect allowlist: exatamente
  `https://comunsocial.online/comun/auth/callback`, sem wildcard.

As credenciais foram transferidas diretamente entre os dois painéis e apagadas
da sessão de automação imediatamente após a confirmação. A flag
`COMUN_GOOGLE_AUTH_ENABLED` continua OFF em Production.

## Promoção e gate humano restantes

O blocker `COMUN_P1G_PROVIDER_CONFIGURATION_HUMAN_ACTION_REQUIRED` foi
resolvido. O provider está configurado; o estado terminal ainda não foi
emitido.

O workflow versionado `comun-p1g-activation.yml` exige exact-head e oferece
somente `flags-off`, `enable-google` e `rollback-google`. Antes de ligar a flag,
ele confirma o provider público; depois preserva e-mail/senha, navegação
anônima e rotas essenciais. Falha no smoke de ativação desliga a flag e promove
novo deploy de rollback. A automação não conclui login Google e não emite o
terminal P1G.

Ainda são obrigatórios: novo preflight metadata verde, CI completa, merge
exact-head, deploy com flag OFF, ativação controlada, início automatizado que
pare no domínio legítimo e, por fim, login humano real, retorno seguro,
onboarding quando aplicável, Minha Participação e logout. Só então pode ser
emitido `COMUN_48_1B_P1G_GOOGLE_AUTH_DOMAIN_GREEN`.

Próximo passo após P1G: `48.1C — Piloto Humano Motorola`. Não iniciar P6B.
