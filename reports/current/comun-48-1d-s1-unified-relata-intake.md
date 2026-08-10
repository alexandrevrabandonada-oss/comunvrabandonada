# COMUN 48.1D-S1 — Relata único

## Fechamento funcional e promoção

Atualizado em 09/08/2026.

- baseline: `origin/main=a9b3671f734afa0241700a15e429d4fbc0453532`;
- PR funcional: `#248`;
- head funcional exato: `f249a868d6f7fe352fce3d10e3d10394a4d1f4b4`;
- merge em `main`: `5e888dc99f5ce10fb414f0be4e8ab21dd53191fd`;
- follow-up do gate Auth/Quality: PR `#249`, head
  `ca25c4cfc8c1ac58819e37e84120ee9f1f91ade2`, merge final
  `643b489fe07126ae7cc372704457279b2d7d5ac6`;
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

## Evidências locais e descartáveis

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
- o E2E persistente no Supabase descartável, run `31341353571`, confirmou
  `COMUN_48_1D_S1_SIDEWALK_P1_FIXED`, `legacyWriteDelta=0`, um relato, um case,
  um protocolo e um item na Carteira;
- o mesmo run preservou foto-only, P3, P5 e P6A, com `externalRequests=0`,
  `publicSnapshots=0` e `hardDeletes=0`;
- Quality completa: run `31341353617`, verde, incluindo o release HTTP em
  porta isolada, ausência dos rótulos do intake legado, acessibilidade,
  performance, PWA, rede degradada e jornadas integrais;
- Core Journeys `31341353576`, Experience Coherence `31341353592`, Full
  Surface/Security `31341353580` e Civic Graph `31341353577`: verdes;
- Preview Vercel do head funcional: verde;
- o gate Production com Google ON revelou que o teste tratava o separador e
  os dois campos `returnTo` legítimos como se fossem o formulário de senha; o
  follow-up escopou os seletores ao formulário “Entrar no COMUN” e removeu o
  nome acessível redundante do separador, sem alterar OAuth ou e-mail/senha;
- Quality do follow-up: run `31342922512`, verde após retry de um `502`
  transitório do Supabase CLI; o gate Auth passou em nove viewports;
- nenhuma migration foi criada e o dry-run remoto reconciliado permaneceu
  `[]`.

## Production

- o deployment Vercel funcional publicou o merge `5e888dc9`; o postflight
  final publicou exatamente `643b489fe07126ae7cc372704457279b2d7d5ac6`;
- `/comun`, `/comun/relatar`, `/comun/relatar?modo=detalhado`,
  `/comun/calcadas`, `/comun/calcadas/contribuir`, `/comun/onibus` e
  `/comun/minha-participacao` responderam `200`;
- as duas variantes de `/comun/relatar` entregaram “Vi um problema” e “O que
  aconteceu?”, sem “Relato detalhado”, “Categoria rápida”, “Enviar relato
  rápido” ou “Abrir formulário detalhado”;
- a prova de persistência já era suficiente no laboratório descartável, então
  nenhuma fixture foi criada em Production: zero relato sintético ativo, zero
  item sintético na Carteira, zero snapshot público, zero coletivo, zero
  request externo e zero hard delete atribuíveis à promoção S1;
- nenhuma flag, migration, dado histórico ou configuração de Auth foi alterada.
- no SHA final, o gate de formulário com Google ON passou novamente em nove
  viewports no domínio, sem submit, login ou criação de sessão.
- post-merge final: Quality `31344408879`, Experience Coherence
  `31344408885`, Core Journeys `31344408876`, Civic Graph `31344408967` e CI
  `31344408880`/`31344449364`, todos verdes; Experience exigiu um retry após
  `502` do Supabase CLI antes das jornadas.

## Piloto

`MOTOROLA-P1-001` permanece registrado no relatório 48.1C. `P01 / J1` e
`P01 / J3` podem ser retomados no domínio corrigido; a tentativa que revelou o
finding não conta como sucesso. P6B permanece proibido.

Resultado terminal:

`COMUN_48_1D_S1_UNIFIED_RELATA_INTAKE_GREEN`
