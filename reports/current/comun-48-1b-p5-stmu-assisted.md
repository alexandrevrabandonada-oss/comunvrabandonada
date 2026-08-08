# COMUN 48.1B-P5B — STMU assistida no domínio

Data: 2026-08-08

## Resultado

`COMUN_P5B_STMU_ASSISTED_READ_ONLY_GREEN`

## Limite operacional

- pacote criado server-side a partir do Relata e do adapter de Ônibus;
- mensagem e assunto ficam visíveis antes de qualquer cópia;
- WhatsApp: `https://wa.me/5524992958558`, sem query;
- e-mail: `mailto:stmu@voltaredonda.rj.gov.br`, sem subject/body;
- abrir o canal exige gesto da pessoa e não equivale a envio;
- somente a declaração explícita “Já enviei” cria `person_declared_sent`;
- a expectativa informativa de 72 horas começa depois dessa declaração e não é
  prazo legal nem garantia;
- protocolo externo é opcional e informado pela pessoa;
- não há bot, acesso à sessão externa, envio server-side ou auto-send.

## Segurança e ativação

- tabelas privadas com RLS habilitada e forçada;
- zero CRUD direto para `PUBLIC`, `anon` e `authenticated`;
- cinco RPCs apenas para `service_role`, com `search_path` fixado;
- eventos append-only e autorização por hash da Carteira;
- primeira ativação read-only: run `31284318553`, falhou em assertion CI-only
  que buscava um literal `mailto:` em vez da constante composta;
- rollback automático da flag STMU no mesmo run: verde; Ônibus permaneceu ON;
- hotfix operacional PR #233, merge `dd8fca19c074f77c145148bbf5ca5bc39f4eb058`;
- ativação final e prova read-only: run `31284607662`, verde;
- contagem de tentativas antes/depois da prova: invariável;
- requests externos: zero;
- envio automático: falso;
- flag Production: `COMUN_STMU_ASSISTED_ENABLED=enabled`.
