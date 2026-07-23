# Configuração de segredos remotos — PR #23

Data da verificação: 22 de julho de 2026 (America/Sao_Paulo)

## Decisão

**REMOTE_SECRETS_CONFIGURED_WITH_ONE_BLOCKER**

As credenciais de aplicação e de banco fornecidas foram configuradas no projeto canônico da Vercel e nos segredos do GitHub Actions. A promoção remota continua bloqueada pela ausência de `SUPABASE_ACCESS_TOKEN`, necessário para operações administrativas autenticadas pela CLI do Supabase.

## Supabase

- Projeto: `nvmdszymrtacfehdynpg` (`nika`).
- Região: `us-west-2`.
- Estado observado: `ACTIVE_HEALTHY`.
- URL pública, chave publicável, chave `anon` legada e chave `service_role` foram validadas contra o endpoint de Auth sem registrar seus valores.
- A conexão PostgreSQL pelo pooler oficial registrado no vínculo local foi confirmada com sucesso.
- As credenciais nativas do projeto não foram duplicadas em Edge Function Secrets: o Supabase já as disponibiliza como segredos padrão.
- Nenhuma migration foi aplicada e nenhum dado foi alterado durante esta configuração.

## Vercel

Projeto canônico: `comunvrabandonada` (`prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X`).

Variáveis configuradas em **Production** e **Preview**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

O ambiente **Development** permaneceu sem credenciais remotas, preservando o uso local isolado. As alterações passam a valer somente em novos deployments; nenhum redeploy ou deploy manual foi executado neste lote.

## GitHub Actions

Repositório: `alexandrevrabandonada-oss/comunvrabandonada`.

Segredos configurados ou atualizados:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_DB_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VERCEL_TOKEN`
- `VERCEL_TEAM_ID`
- `VERCEL_CANONICAL_PROJECT_ID`
- `VERCEL_LEGACY_PROJECT_ID`

Segredos preexistentes preservados:

- `ARCHIVE_PROCESSING_CRON_SECRET`
- `ARCHIVE_PROCESSING_ENDPOINT`

Bloqueador ainda ausente:

- `SUPABASE_ACCESS_TOKEN`: não fornecido e não recuperável em texto do armazenamento seguro local. Ele deve ser criado como token pessoal do Supabase e adicionado ao GitHub antes da automação administrativa remota.

## Validações

- Endpoint de Auth com chave publicável: aprovado (`HTTP 200`).
- Endpoint de Auth com chave `anon`: aprovado (`HTTP 200`).
- Endpoint de Auth com chave `service_role`: aprovado (`HTTP 200`).
- Conexão PostgreSQL remota pelo pooler: aprovada.
- Vercel: nomes e escopos conferidos sem leitura dos valores protegidos.
- GitHub: nomes e datas de atualização conferidos sem exposição dos valores.
- Segredos não foram gravados neste relatório nem adicionados ao Git.

## Segurança e próxima ação obrigatória

A senha do banco e as chaves JWT privilegiadas foram compartilhadas diretamente na conversa. Por precaução, devem ser rotacionadas após o fechamento desta configuração. Depois da rotação, é obrigatório atualizar os valores correspondentes na Vercel e no GitHub Actions e repetir as validações de Auth e banco.

Para remover o bloqueador operacional, criar um token pessoal no Supabase, cadastrar somente o valor como `SUPABASE_ACCESS_TOKEN` nos Actions secrets e validar o contrato da automação antes de qualquer migration.

## Declarações de escopo

- Nenhum segredo foi incluído no repositório ou neste relatório.
- Nenhuma migration remota foi aplicada.
- Nenhum merge foi executado.
- Nenhum domínio foi movido.
- Nenhum deploy manual ou de produção foi executado.
- Nenhuma configuração de R2 foi alterada.
- O gate humano permanece `0/3`.
- O piloto público permanece fechado.
