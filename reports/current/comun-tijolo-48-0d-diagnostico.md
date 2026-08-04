# COMUN — Tijolo 48.0D — diagnóstico local

Data: 2026-08-04
Baseline: `118f1d4c88cc6915ef471ba59cfcfbcf0355d770`; merge final `261c853d606158ce349fa24cf1cb7b3a74a60f31`; Production `dpl_G9iA4Mgn6jAcuuFqDgtQiKcgD7q6`

## DIAG

O worktree deste tijolo parte exatamente de `origin/main` no SHA documental confirmado. A árvore está isolada da cópia de trabalho suja do repositório e não há divergência não forward-only. A verificação read-only de Production confirmou `/comun`, App V2 e fallback com `200`, `/comun/relata` com `404` e a API de evidências dormente.

O 48.0B criou `public.comun_relata_public_snapshots` com `CHECK (publication_state = 'blocked')`, RLS forçado, grants revogados e trigger que rejeita qualquer insert/update/delete. Esse contrato é deliberadamente individual e não possui consumidor público. Ele não será alterado: a projeção do 48.0D será aditiva e local-only.

O 48.0C já fornece casos coletivos, memberships, eventos append-only, localização privada cifrada, HMACs de agrupamento e bucket privado de fotografias. Os RPCs de evidência são server-only e o proxy já mascara a família `/api/comun/relata/evidence` quando as três barreiras locais não estão ativas. A localização exacta não pode ser usada pelo banco para desenhar mapa; a célula métrica pública deve ser derivada no runtime server-side e persistida somente como candidato aproximado.

Há MapLibre/PMTiles no projeto, com carregamento dinâmico em Calçadas. A mesma técnica é apropriada para o mapa local, mas a lista acessível deve continuar disponível sem carregar o mapa. Não há rota nem API pública Relata no baseline.

## PLANO seguro

1. Acrescentar a quarta barreira `COMUN_RELATA_LOCAL_PUBLIC_MAP` e cloaking antes do dispatch para todos os métodos.
2. Criar migration forward-only, sem tocar na migration 48.0B, com tabelas server-only para projeção sanitizada, candidatos de célula e confirmações comunitárias.
3. Implementar política versionada e funções puras de elegibilidade/célula métrica, sem texto privado, coordenada exata, geohash reversível, embeddings ou LLM.
4. Expor apenas endpoints locais allowlisted e um mapa/lista lazy, com confirmação anônima first-party limitada ao próprio caso projetado.
5. Testar flags, monotonicidade espacial, sanitização, confirmação idempotente, no-leak e regressões. Production deve continuar retornando `404` para a nova superfície.

## Riscos/bloqueios observados

- A antiga tabela de snapshots permanece bloqueada por contrato; qualquer tentativa de reutilizá-la como publicação seria um blocker de segurança.
- A projeção não pode afirmar que uma fotografia é publicável e não pode revelar status oficial.
- O mapa só é elegível sob as regras templated do 48.0D; categorias de risco, emergência, saúde, crianças, violência e acusação individualizada ficam bloqueadas.

## Recuperação 48.0D-R1

Docker Desktop `4.61.0` / Engine `29.2.1` (`desktop-linux`) e WSL2 estavam saudáveis. `npx supabase` `2.111.0` foi usado; a configuração original reservava `55432`, faixa Windows excluída `55360–55459`. O laboratório foi deslocado temporariamente para API `56431`, DB `56432`, Studio `56433`, Mailpit `56434`, analytics `56437` e pooler `56439`; `supabase/config.toml` foi restaurado ao final.

Houve dois incidentes de infraestrutura durante a recuperação: inicialização com porta reservada e gateway Kong apontando para IP antigo do Storage (`502`, host unreachable) após reinícios. O retry focal com restart do container Kong e reset `--no-seed` completou a cadeia SQL; Storage, seed de buckets e restore passaram separadamente. Nenhum incidente alterou a migration ou foi classificado como finding de produto.

Conclusão: `COMUN_RELATA_48_0D_MERGED_DORMANT_LOCAL_SANITIZED_MAP_GREEN_REMOTE_UNCHANGED`. PR #156 e todas as lanes pós-merge ficaram verdes; Production permanece dormente e não houve consulta, migration ou escrita no Supabase remoto.
