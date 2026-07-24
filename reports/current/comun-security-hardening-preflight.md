# Preflight canônico do hardening de segurança

Captura read-only final: 23 de julho de 2026. Fingerprint remoto bloqueante:
`b4d66ad06d1aba22930609f58b0ea1696fbfe5747a21f141dcedc97766d672de`.
Workflow de evidência determinística: `COMUN Nightly` run `30054188587`.

## View e dependência

`public.comun_public_reports`, owner `postgres`, sem reloptions, projeta apenas
`id`, protocolo, comunidade, pauta, título, texto público, período, localização
aproximada, bairro, status, risco e timestamps. Não projeta texto bruto,
contato, notas internas, latitude, longitude ou precisão.

A única relação subjacente é `public.comun_reports`, com RLS habilitada. A policy
de SELECT vigente era `USING (false)`, portanto `security_invoker=true` isolado
quebraria o contrato público. A migration adiciona uma policy limitada a
`status='published'`, `public_text IS NOT NULL` e
`can_publish_sanitized IS TRUE`, além de grants de coluna restritos à projeção e
ao predicado. Não existe grant das colunas privadas.

Antes: `anon` e `authenticated` tinham `SELECT`, `REFERENCES`, `TRIGGER` e
`TRUNCATE` na view. Depois: somente `SELECT`.

## Funções e onboarding

- `claim_next_archive_processing_job(text)`: owner `postgres`,
  `SECURITY DEFINER`, `search_path=public`, EXECUTE apenas por `postgres` e
  `service_role`; relações de aplicação qualificadas com `public`.
- `handle_new_user()`: owner `postgres`, `SECURITY DEFINER`,
  `search_path=public`, EXECUTE apenas por `postgres` e `service_role`; grava
  somente em `public.profiles`.
- trigger comprovado: `on_auth_user_created`, `AFTER INSERT ON auth.users`,
  chamando `public.handle_new_user()`.

Decisão: preservar comportamento, owner, assinatura, trigger e grants
operacionais; trocar somente o `search_path` por `pg_catalog`.

## Default privileges

Foram capturados defaults de `postgres` e `supabase_admin` no schema `public`
que concediam privilégios futuros a `anon` e `authenticated` em tabelas,
sequences e/ou funções. A migration revoga somente os defaults cujo owner é
`postgres`, no schema `public`. Defaults de `supabase_admin`, assim como
`auth`, `storage`, `graphql` e `extensions`, ficam fora do escopo mutável.

Nenhuma linha de aplicação, usuário, e-mail, metadata, objeto de Storage ou
segredo foi consultado ou persistido.

## Reclassificação final

A segunda captura read-only (`COMUN Nightly` run `30049331224`) comprovou:
`current_user=postgres` e
`pg_has_role(postgres, supabase_admin, 'SET')=false`. Isso confirma que defaults
cujo owner é `supabase_admin` são internos da plataforma, não objetos
corrigíveis pelo operador do COMUN.

Eles permanecem íntegros no snapshot informativo, com quantidade e hash, mas
não entram no fingerprint bloqueante. Defaults cujo owner é `postgres`
continuam bloqueantes e são corrigidos pela migration. Nenhuma escrita remota
foi executada.

## Resultado dos gates

- HEAD técnico: `9ea9cc8b2cfaee6303fcd1ee8abe15e65c609107`;
- pós projetado:
  `82989755711d63a14d209cc2074fd3656288e74fb030331dac282acac7a8265b`;
- bloqueantes: 9 antes, 0 depois;
- observação gerenciada: 1, referente a 3 defaults de `supabase_admin`;
- FAST e FULL: run `30054740000`, sucesso;
- Vercel Preview: sucesso;
- decisão: `COMUN_SECURITY_HARDENING_READY_TO_PROMOTE`.
