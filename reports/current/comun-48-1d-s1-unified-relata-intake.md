# COMUN 48.1D-S1 — Relata único

## Candidato em validação

Atualizado em 09/08/2026.

- baseline: `origin/main=a9b3671f734afa0241700a15e429d4fbc0453532`;
- branch: `codex/48-1d-s1-unified-relata`;
- finding de origem: `MOTOROLA-P1-001` (`P01 / J1` e `P01 / J3`);
- migrations planejadas: `0`;
- dados históricos migrados: `0`;
- auto-send: `OFF`;
- publicação automática: `OFF`;
- `launch_publicly=false`.

## Inventário dos pipelines

### Canônico

`QuickCaptureV2` → `/api/comun/relata` →
`private.comun_relata_reports` → `public.comun_relata_cases` →
`COMUN-RELATA-*` → Participation Wallet → evidências privadas P3.

### Legado

`ReportForm` → `submitReport` → `comun_reports` →
`comun_report_attachments` → `generateProtocol()` → confirmação legada.

O inventário read-only encontrou um único caller funcional de `submitReport`:
`app/comun/relatar/report-form.tsx`. Antes do patch, ele era alcançado somente
pela bifurcação pública `?modo=detalhado`. A rota administrativa
`/comun/admin/relatos/[id]` é leitura histórica e permanece intacta.

O patch retira o `ReportForm` da árvore pública, ignora `modo=detalhado` e marca
o componente preservado com `LEGACY_INTAKE_NOT_CANONICAL`. As tabelas, anexos,
protocolos e consulta histórica legados não são apagados nem copiados.

## Contratos do patch

- `/comun/relatar` é a única entrada canônica;
- `/comun/relatar?modo=detalhado` renderiza a mesma entrada;
- `/comun/relata` redireciona permanentemente para `/comun/relatar`;
- texto com oito caracteres ou foto válida mantém `Guardar` disponível;
- perguntas adaptativas são tipadas por `id`, `answerKey`, `options` e
  `blocking:false`;
- a API não usa `missingInformation` como gate de captura;
- calçada bloqueada por entulho classifica como `sidewalk_accessibility` sem
  pergunta bloqueante;
- luz ambígua sem resposta fica em `other`, com baixa confiança e revisão
  humana, sem encaminhamento automático;
- fallback desconhecido fica em `other`, sem loop;
- fumaça pode receber orientação imediata e ainda ser guardada;
- foto-only continua sem texto inventado e sem classificação visual;
- completar Calçadas reutiliza o recibo atual e o adapter P4 no mesmo protocolo.

## Evidências locais e remotas read-only

- testes unitários completos: `126` arquivos e `570` testes verdes;
- matriz responsiva do intake canônico: `30/30` cenários verdes em cinco
  viewports, incluindo Calçadas, fallback `other`, fumaça, luz ambígua e aliases;
- typecheck: verde;
- lint: verde;
- build Next.js: verde (`118` páginas);
- `git diff --check`: verde;
- plano remoto reconciliado read-only: `[]`; a exceção externa histórica de
  Calçadas foi restaurada com checksum íntegro; sem `--include-all`, repair,
  reset ou seed;
- o job descartável existente exige agora
  `COMUN_48_1D_S1_SIDEWALK_P1_FIXED` e `legacyWriteDelta=0` além dos gates P6A;
- E2E persistente com Supabase descartável: pendente na CI. A tentativa local
  foi interrompida pelo armazenamento Docker (`input/output error`) antes do
  exercício do banco; não houve reset, escrita remota ou promoção para
  contornar a falha do laboratório.

O terminal S1 não é declarado neste estado intermediário.
