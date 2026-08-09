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
- contrato do workflow: 3/3;
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

Resultados de run e artefato serão acrescentados após a execução no PR.

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

## Gate humano único

Resultado atual: `COMUN_P1G_PROVIDER_CONFIGURATION_HUMAN_ACTION_REQUIRED`.

A conta aberta no Google Cloud mostra o aceite inicial dos Termos de Serviço
como requisito anterior à lista de clientes. Esse aceite é uma decisão humana
e não foi realizado automaticamente. A conta Supabase conectada ao ambiente de
trabalho também não possui acesso ao projeto Production.

Ação mínima do responsável, sem enviar qualquer segredo ao COMUN ou ao agente:

1. na aba Google Cloud já aberta, revisar e aceitar os Termos de Serviço;
2. selecionar o projeto do COMUN e criar/confirmar um cliente OAuth do tipo
   **Web application**;
3. registrar origem JavaScript `https://comunsocial.online`;
4. registrar como redirect Google o callback exibido pelo provider Supabase,
   no formato `https://<project-ref>.supabase.co/auth/v1/callback`;
5. no projeto Production do Supabase, definir Site URL
   `https://comunsocial.online` e redirect exato
   `https://comunsocial.online/comun/auth/callback`;
6. inserir Client ID e Client Secret somente no provider Google do Supabase e
   habilitá-lo;
7. informar apenas que a configuração terminou — não copiar Client ID, Client
   Secret, código OAuth, token, cookie, e-mail ou nome para esta tarefa.

Depois desse gate, ainda são obrigatórios: preflight metadata verde, merge
exact-head, deploy com flag OFF, ativação da flag, login humano novo e
existente, retorno seguro, logout e regressões Production. Só então pode ser
emitido `COMUN_48_1B_P1G_GOOGLE_AUTH_DOMAIN_GREEN`.

Próximo passo após P1G: `48.1C — Piloto Humano Motorola`. Não iniciar P6B.
