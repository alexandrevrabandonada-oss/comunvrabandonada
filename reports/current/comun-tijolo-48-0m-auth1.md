# COMUN — 48.0M-AUTH1 · Google Auth dormente

Data: 2026-08-05

## Diagnóstico

- e-mail/senha e criação manual já utilizavam Supabase Auth via cliente SSR;
- `safeCommunityReturn` restringe retornos a rotas internas `/comun`;
- não havia callback OAuth Google funcional;
- a Carteira permanece um domínio anônimo separado, autorizado por cookie próprio; o patch não rotaciona, reivindica ou duplica itens;
- RLS e perfil comunitário continuam mediados server-side por `service_role`, sem exposição ao navegador.

## Implementação

- flag opt-in `COMUN_GOOGLE_AUTH_ENABLED=enabled`;
- botão acessível `Continuar com Google` na entrada e criação de conta, oculto quando a flag está desligada;
- ação server-side com `signInWithOAuth`, provider `google`, PKCE/SSR e escopos mínimos `openid email profile`;
- allowlist de origem para localhost, Preview autorizado e `https://comunsocial.online`;
- callback `/comun/auth/callback` com troca `exchangeCodeForSession`, retorno interno, erro genérico e nenhum token em URL/log;
- usuário existente preserva `user.id`, perfil e contexto;
- usuário novo recebe perfil privado provisório e vai para `/comun/completar-conta`, onde nome, termos e política são confirmados;
- nome do Google é apenas sugestão privada editável; foto, e-mail e tokens do provider não são publicados ou persistidos;
- nenhuma migration foi criada e nenhuma credencial real foi adicionada.

## Verificação local

- teste focal Google/retorno: 14/14;
- typecheck: verde;
- lint: verde;
- build: verde;
- rotas geradas incluem callback e completar-conta;
- smoke local com a flag desligada confirmou `/comun/entrar` e `/comun/criar-conta` em `200`, sem o botão Google e sem script `accounts.google.com`;
- provider real não foi acionado; nenhum segredo foi usado.
- E2E comunitário completo foi tentado, mas o harness parou no setup por `ECONNREFUSED 127.0.0.1:55431`; duas tentativas de reset local descartável falharam no bootstrap do container. Não foi classificado como finding OAuth e a configuração de portas foi restaurada.

## Estado e gates

Resultado técnico: `COMUN_AUTH_GOOGLE_48_0M_CODE_READY_PROVIDER_CONFIGURATION_PENDING`.

O resultado humano integrado permanece `COMUN_INTEGRATED_HUMAN_REHEARSAL_INCOMPLETE`. A configuração real do Google no Supabase/Preview HTTPS é o único gate manual posterior. Não emitir `COMUN_AUTH_GOOGLE_ENABLED`, não ativar Production e não iniciar 48.1.
