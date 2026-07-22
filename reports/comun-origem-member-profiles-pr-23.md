# Origem de `comun_member_profiles` — PR #23

## Conclusão comprovada

A tabela foi introduzida no remoto pela migration registrada:

- arquivo: `20260720005353_comun_archive_identification_campaign.sql`;
- commit: `bf1f95331a432072a57d6e28b1db08bcd137c905`;
- data do commit: 19 de julho de 2026, 22:16:27 -03:00;
- mensagem: `feat: cria identificacao comunitaria do acervo fotografico`.

Esse arquivo cria `comun_member_profiles` e `comun_member_inbox` com `IF NOT EXISTS` antes e novamente depois do bloco principal da campanha. A duplicação está no próprio arquivo. Como a migration foi registrada remotamente fora da sequência, as tabelas apareceram sem registrar `20260715032613`, `20260715155802` e `20260715192935`.

## Deployment correlacionado

O commit gerou o preview Vercel:

- URL: `comunvrabandonada-fj0iipuj6-alexandrevrabandonada-oss-projects.vercel.app`;
- estado: `READY`;
- branch: `codex/comun-gate-humano-local`;
- PR associada: #13;
- origem: GitHub.

Não há workflow no repositório que aplique migrations durante deployment Vercel. Portanto o deployment prova correlação temporal, mas **não prova quem ou qual comando executou o push do banco**. Nenhum script administrativo encontrado referencia diretamente essa versão. O operador/comando permanece não comprovado.

## Comparação estrutural

### Colunas

As 16 colunas remotas correspondem em nome, tipo, nullability e default ao conjunto final. A ordem física difere porque a migration fora de ordem criou a tabela já evoluída.

### Constraints remotas

- PK em `user_id`;
- unique em `public_slug`;
- checks de `participation_visibility`, `profile_visibility` e `status`;
- FK `user_id → auth.users(id) ON DELETE CASCADE`.

### Constraints no final local

- mesma PK, unique e checks;
- FK `territory_id → comun_hub_territories(id) ON DELETE SET NULL`;
- **não contém** a FK Auth, porque a criação histórica mais antiga definiu `user_id` sem referência e a migration posterior usa `IF NOT EXISTS`.

### Índices, trigger, grants e RLS

- índice da PK e unique presentes;
- trigger `comun_member_profiles_updated_at` presente e ligado a `set_updated_at()`;
- RLS habilitada;
- nenhuma policy direta no remoto;
- `anon` e `authenticated` revogados pelo SQL da migration;
- CRUD concedido ao `service_role`.

## Dependências

- `auth.users` pelo `user_id` remoto;
- `comun_hub_territories` pelo `territory_id` esperado no final;
- `comun_pauta_memberships`, comunidades persistentes, contribuições de acervo e jornadas de Minha área usam `user_id`;
- `getCommunitySession()` consulta status, visibilidade e onboarding;
- trigger usa `public.set_updated_at()`.

## Scripts e SQL fora da CLI

- não foi encontrado script no repositório que crie a tabela fora das migrations;
- não foi encontrado workflow com `supabase db push` ou SQL remoto;
- existe script npm genérico `db:push`, mas ele não registra autoria de uma execução passada;
- `handle_new_user()` e seu possível trigger Auth não aparecem no Git, constituindo drift separado de origem desconhecida.

## Decisão

`comun_member_profiles` é **REMOTE_AHEAD em colunas**, mas **STRUCTURALLY_DIFFERENT em integridade referencial**. Não deve ser ignorada com `IF NOT EXISTS` nem marcada como equivalente. A reconciliação segura deve manter a FK Auth remota, adicionar a FK territorial após validar dados e criar uma migration nova para que ambientes finais também recebam ambas.
