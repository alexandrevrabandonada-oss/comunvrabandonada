# COMUN Tijolo 48.0H — diagnóstico

## Baseline

- `origin/main`: `7a4ebaa5ab9b59323fe55cd7c9f0dd87c8c28ffe` (descendente legítima do 48.0G); branch: `codex/tijolo-48-0h-forwarding-fiscaliza`.
- Production observado antes do patch: `/comun` e `/comun/relatar` `200`; Relata, Ônibus e APIs da Carteira `404`; domínio `comunsocial.online`; deployment informado `dpl_7EA5JpeS3zEMezV8EQa7YDktYAGs`.
- Relata é fonte canônica; Carteira é autorização/organização; legado é projeção reversível. Não houve consulta ou escrita remota.

## Inventário e decisão

- Catálogo existente: `vr-fiscaliza-web`, fonte municipal verificada, checagem operacional pendente, automação proibida.
- Fonte oficial revalidada em 04/08/2026: página municipal do Fiscaliza VR e Carta de Serviços 435. A descrição informa categoria “Iluminação e Energia”, descrição, bairro/referência, foto opcional, protocolo/acompanhamento e resposta inicial de até 48 horas. Esse prazo é expectativa da fonte, não prazo legal.
- Não existe no repositório um canal operacional comprovado para envio automático. O adaptador é, portanto, um pacote privado + abertura assistida explícita no site oficial.
- O conflito semântico entre relato privado, pacote, tentativa e protocolo oficial foi mantido separado; nenhum protocolo COMUN é convertido em protocolo de órgão.

## Infraestrutura local

- Supabase CLI via `npx`; stack Docker local em portas `56431–56439` por estado compartilhado anterior (configuração restaurada ao baseline `55431–55439` após os testes).
- O primeiro seed expôs campo inválido no adaptador e foi corrigido. Resets subsequentes tiveram 502 transitório do gateway Storage; retries focais no mesmo SHA concluíram a cadeia inteira. Não é finding do produto.
- Migration H foi aplicada em banco descartável limpo; nenhuma migration remota foi aplicada.

## Riscos classificados

- Operacional: `pending`, pois ainda não houve preenchimento real do Fiscaliza VR.
- Jurídico: prazo de 48h é não legal; não há declaração automática de envio.
- Privacidade: contato fica em tabela separada; listagem segura omite valor; RLS/grants service-role-only.
- Produto: sem envio externo, sem canal adicional público, sem ativação de flag em Production.

## Integração

- PR principal: #160, checks e Preview verdes; merge squash `e07e5f7324817dfad6a643a97bbcb2b2383a6c52`.
- Production: deployment `dpl_7H9z7JzbuosPKepQ3mCLFSUKkXbz`, `READY`, domínio `comunsocial.online`.
- Smoke pós-merge: `/comun=200`, `/comun/relatar=200`, `/comun/relata=404`, `/comun/onibus=404`, Carteira `307` para autenticação; todos os métodos GET/POST/PATCH/PUT/DELETE de `/api/comun/forwarding/packages` retornaram `404`.

Resultado: `COMUN_FORWARDING_48_0H_MERGED_DORMANT_LOCAL_FISCALIZA_ADAPTER_GREEN_REMOTE_UNCHANGED`.
