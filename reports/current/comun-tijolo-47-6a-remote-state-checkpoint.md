# TIJOLO 47.6A — reconciliação do estado remoto cultural

## Objetivo

Reconciliar, sem reabrir a arquitetura cultural, o contrato versionado com o estado remoto de buckets, acessibilidade editorial e policies de Storage. O checkpoint não cria mídia, não publica conteúdo e não altera direitos, consentimentos, migrations ou o gate `launch_publicly`.

## Base e diagnóstico inicial

- Base confirmada: `fa3ed469235010724286d67b0a79c9af39ce6167`
- Audit read-only inicial: run `30578439459`
- Target allowlisted: verificado
- Schema cultural: 11/11
- Tabelas culturais sem RLS: 0
- Grants públicos perigosos nas tabelas culturais: 0
- Buckets presentes antes: 2/4
- Buckets ausentes: `radio-private-originals` e `radio-public-audio`
- Buckets existentes incompatíveis: 0
- Buckets de nome semelhante inesperados: 0
- Policies de `storage.buckets` e `storage.objects`: nenhuma
- RLS desabilitada nas tabelas de Storage auditadas: 0
- Escrita pública permitida por policy: não
- Operação de serviço server-side: disponível
- Imagens efetivamente publicadas sem texto alternativo: 1
- Objetos de Storage criados durante o diagnóstico: 0
- Escritas remotas durante o diagnóstico: nenhuma

## Inspeção editorial da imagem

A derivada pública foi inspecionada visualmente no projeto e contexto corretos. A imagem mostra um trecho de calçada de concreto com rachaduras, vegetação e uma abertura circular junto a um muro amarelo. O contrato editorial usa essa descrição objetiva, sem inferir pessoa, data ou lugar e sem expor ID, chave ou URL.

## Contrato de reparo

O reparo:

1. recalcula o preflight completo no SHA imutável da `main`;
2. exige hash exato do plano sanitizado;
3. cria somente os buckets ausentes pela API oficial do Storage;
4. nunca atualiza bucket existente;
5. não cria, move ou remove objetos;
6. relê a configuração campo a campo;
7. valida novamente o fingerprint da linha e o SHA-256 da imagem;
8. atualiza somente `alt_text` quando o campo continua vazio e o item continua aprovado, publicado e público;
9. executa postflight independente;
10. libera o ensaio privado somente com o estado estrutural verde.

Allowlist máxima:

- até dois registros de bucket;
- um campo `alt_text`;
- zero objetos;
- zero direitos;
- zero consentimentos;
- zero alteração de status editorial.

## Resultado e limite

O resultado máximo permanece:

`COMUN_ARCHIVE_RADIO_ART_READY_FOR_REAL_CONTENT_REHEARSAL`

O domínio `archive_radio_art` permanece `evidence_required`. Acervo, Rádio e Arte ainda dependem de conteúdo real autorizado, direitos completos, smoke público e evidência editorial explícita. Este checkpoint não constitui promoção para `green`.

## Fechamento pós-merge

- PR: #108
- SHA candidato: `08a1a60485621d3c417b7510625307364a113592`
- Merge SHA: `6126f2ce2dde3c6f39be91301c86e380027b96f5`
- Deployment do merge: READY
- Preflight pós-deploy: run `30581991491`, somente leitura, verde como
  execução e bloqueado como estado do domínio
- Tentativa de reparo exato: run `30582088607`
- Postflight independente: run `30582179111`, somente leitura

O preflight confirmou o plano exato:

- buckets presentes: 2/4;
- buckets ausentes: `radio-private-originals` e `radio-public-audio`;
- buckets existentes incompatíveis: 0;
- policies perigosas: 0;
- imagem efetivamente publicada sem texto alternativo: 1;
- hash sanitizado do plano:
  `6fe07f69fb992c56e0b0d4895a7fcb47e6e885aec18061b32c0ded107aee72aa`.

A tentativa de reparo foi encerrada na primeira criação de bucket, antes da
atualização editorial, com o marcador sanitizado
`COMUN_CULTURAL_REMOTE_REPAIR_BUCKET_CREATE_FAILED`. O postflight independente
provou que nenhum efeito parcial ocorreu: os mesmos dois buckets continuam
ausentes, a mesma imagem continua sem texto alternativo e nenhum objeto foi
criado.

Uma inspeção read-only posterior da configuração canônica do projeto comprovou
a causa: o projeto está no plano Free, cujo limite global de arquivo é 50 MB.
Os dois buckets de Rádio exigem exatamente 250 MiB pelo contrato versionado.
A API oficial do Storage não pode criar buckets com limite superior ao limite
global do projeto.

O contrato não foi reduzido para 50 MB, nenhum bucket incompatível foi criado e
nenhuma alteração financeira ou de plano foi executada. Esse tipo de alteração
fica fora da autorização deste checkpoint. Também não foi feita uma correção
parcial do texto alternativo, pois o postflight estrutural não poderia ficar
verde e o plano exato não autoriza uma promoção parcial.

Estado final comprovado:

- Storage: 2/4 buckets; 0 buckets e 0 objetos criados;
- policies: `COMUN_CULTURAL_STORAGE_POLICIES_GREEN`;
- imagem publicada sem alt text: 1;
- banco: nenhuma escrita;
- Storage: nenhuma escrita;
- direitos, consentimentos e status editorial: inalterados;
- ensaio privado remoto: não executado;
- conteúdo real comprovado: Acervo 0, Rádio 0, Arte 0;
- `archive_radio_art`: `evidence_required`;
- `miniapps`: `in_progress`;
- programa de dez domínios: 3 green, 2 in progress, 4 blocked e 1
  evidence_required;
- `launch_publicly`: não acionado.

Resultado terminal preservado:

`COMUN_ARCHIVE_RADIO_ART_BLOCKED_REMOTE_STATE`

O próximo passo exige uma decisão humana separada sobre capacidade do projeto:
elevar o limite global do Storage para pelo menos 250 MiB sem reduzir o
contrato cultural. Somente depois disso o mesmo plano deve ser relido
integralmente antes de uma nova tentativa. A correção de acessibilidade e o
ensaio privado continuam bloqueados até o postflight estrutural ficar verde.

## Limite da validação local

O reset descartável local foi interrompido por uma incompatibilidade anterior e fora do escopo deste checkpoint: a migration `20260708182724_restore_public_reports_view_grants.sql` detectou que `public.handle_new_user()` não corresponde ao contrato esperado do trigger de autenticação anônima (`COMUN_ANONYMOUS_AUTH_PROFILE_TRIGGER_POSTFLIGHT_FAILED`). Nenhum arquivo desse domínio foi alterado e a stack local foi destruída. Por isso, os smokes que dependem do schema Supabase local completo ficam representados pelos testes de contrato e pelo postflight remoto independente; o reparo cultural permanece bloqueado até que esse postflight confirme schema, RLS, grants, Storage e acessibilidade no target allowlisted.

## Evidência local e pública

- Testes focais de auditoria, contrato, reparo, ensaio e workflow: 36/36
- Regressões Vitest de Acervo, Rádio, Arte e entregabilidade: 20/20
- Suíte unitária do repositório: 357/357
- Rádio pública em 360×800, 390×844, 768×1024 e 1366×768: 24/24
- Acessibilidade focal da Rádio: 16/16
- Arte territorial pública e fronteiras de autenticação: 28/28
- Acessibilidade focal da Arte: 16/16
- Typecheck, lint, build, Prettier e `git diff --check`: verdes
- Migration e releases versionadas: inalteradas

As matrizes de navegador foram executadas somente com navegação pública segura. Nenhum formulário foi submetido e nenhum método mutável foi usado. Os scripts genéricos legados `smoke:public-ui` e `smoke:no-leak-http` ainda possuem assertions de texto de outras superfícies e, por isso, não constituem evidência cultural neste checkpoint; as rotas culturais responderam HTTP 200 e as suítes focais não encontraram marcadores privados.
