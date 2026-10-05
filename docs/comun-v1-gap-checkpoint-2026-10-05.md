# Fechamento das lacunas V1 — 05/10/2026

Base: `8f66a5ed48259340a9578d82552036818a142c6a` (#489).
Escopo vinculante: [entregabilidade #95](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/issues/95),
[programa V1](comun-v1-launch-scope.md) e
[roadmap](comun-product-objective-and-roadmap.md). Calçadas em circulação permanece o piloto.

## Diagnóstico reproduzido e correção candidata

O checkpoint pós-#489 de 05/10 às 20:58 UTC tinha dez achados: quatro rotas e
seis domínios declarados incompletos. Novas respostas HTTP públicas, observadas
via integração Vercel em 05/10, reproduziram os quatro sinais na mesma base.
As respostas completas não foram incorporadas ao repositório: contêm dados
públicos de negócio e material temporário da integração que não pertence à prova.

| Rota        | Causa isolada                                                                                | Resultado da correção sobre a resposta capturada                    |
| ----------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Comunidades | `placeholder:` em `className` dentro do transporte RSC reaparecia na varredura decodificada  | contrato válido, nenhum marcador não resolvido                      |
| Acervo      | mesma sintaxe CSS no transporte RSC                                                          | contrato válido, nenhum marcador não resolvido                      |
| Calçadas    | conteúdo enviado por `$RS(S:n,P:n)` não era inserido no `main` antes da inspeção             | contrato válido; uma inserção e uma conclusão Suspense reconhecidas |
| Segurança   | resposta HTTP sem estrutura principal exposta; conteúdo depende de renderização no navegador | permanece bloqueada no auditor HTTP                                 |

No navegador cloud, Segurança renderizou um `main` e o H1 “Como o COMUN
protege relatos”. A explicação exata de fixtures descartáveis estava exposta
no conteúdo principal. Isso confirma a tela observada, mas não cria uma
exceção para títulos existentes apenas em RSC, não certifica procedência
editorial nem substitui ensaio físico ou assistivo.

O parser reconhece somente inserções com IDs únicos, tipos esperados e comando
terminal conhecido; não avalia JavaScript e não expõe segmentos arbitrários.
A classificação de CSS é limitada a atributos HTML de classe e `className`
no transporte RSC conhecido. Valores de texto, placeholders com dados sintéticos,
scripts desconhecidos, conteúdo escondido, comentários e Unicode escapado
continuam sujeitos à inspeção. Transporte não reconhecido permanece pendente.

Validação candidata: 19 testes focais passaram, incluindo assets/indexação,
inserção incompleta, destino ausente/duplicado/escondido, H1 escondido,
dados sintéticos em payload e escapes. ESLint, sintaxe e whitespace passaram.
Não há alteração de páginas, banco, permissões, flags ou estados dos domínios.

Uma execução anônima adicional do auditor anterior registrou onze achados:
os dez conhecidos e timeout (`status: 0`) em `/comun/admin/calcadas/operacao`.
Timeout não comprova exposição de conteúdo administrativo. A leitura pela
integração Vercel foi rejeitada pela revisão automática por poder gerar bypass
de autenticação. Não foi contornada. O código da rota chama
`requireComunAdmin({ roles: ["admin", "editor"] })` antes da leitura operacional;
a confirmação HTTP dessa rota continua pendente. Não declarar nova regressão
de autorização a partir do timeout. Não há auditoria completa pós-correção nesta prova.

## Seis frentes ainda abertas

| Frente                  | Trabalho existente a reutilizar                                                          | Evidência ainda necessária                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Miniapps                | `scripts/smoke-comun-sidewalk-pilot.mjs`, closeout 47.5 e piloto `calcadas-vr-piloto-01` | observação read-only atual, amostra real, denominadores e SLA; não reiniciar janela nem interpretar zeros históricos como uso atual                     |
| Acervo/Rádio/Arte       | filas de curadoria, direitos e publicação existentes                                     | itens reais, titularidade/consentimento, derivadas, áudio/transcrição e revisão por superfície; não inserir fixtures públicas                           |
| Segurança e recuperação | `docs/comun-security-backup-recovery.md` e ensaios descartáveis existentes               | capacidade contratada atual, cópia durável independente, restore de banco/Auth/Storage e tempos medidos; o plano histórico não comprova o plano vigente |
| Qualidade               | `docs/comun-quality-real-device-rehearsal.md`                                            | Android físico, segunda plataforma, baixa visão/assistiva, zoom 200% e captura real consentida; manter lista equivalente ao mapa                        |
| Governança              | operação, normas, ajuda, devolutiva e escala existentes                                  | titulares e substitutos confirmados, contato operacional, prazos e direitos revisados; não deduzir nomes ou autorizações                                |
| Ensaio integrado        | `docs/gates/COMUN_HUMAN_GATE.md` e resultados 48.0M                                      | três sessões reais consentidas, tarefas/tempos, incidentes resolvidos, estabilidade e decisão final                                                     |

O header `camera=()` não é prova isolada de falha: os fluxos examinados usam
`input type=file capture=environment`, e não `getUserMedia`. A captura precisa
ser observada no dispositivo real antes de alterar a política de permissões.
Busca semântica, mapas/WebGL2 e capacidades remotas também precisam de provas
próprias; fallback técnico não comprova execução da capacidade principal.

## Próxima sequência verificável

1. Revisar/integrar o contrato candidato depois dos checks do SHA exato.
2. Reconciliar a confirmação de Segurança no navegador com a limitação HTTP,
   preservando inspeção independente de vazamento e sem aceitar títulos só em scripts.
3. Reunir os envelopes atuais do piloto e recuperação em execuções autorizadas,
   preservando janela, SHA, categoria, origem e limites de cada evidência.
4. Executar a matriz física e três sessões do gate existente quando participantes
   reais estiverem disponíveis; registrar falhas e corrigir as tarefas afetadas.
5. Confirmar conteúdo, responsáveis e recuperação antes da decisão terminal.

Nenhum achado da #95 foi encerrado. Nenhum domínio foi promovido e
`launch_publicly` permanece separado. Núcleos, ciclo estratégico e formação
da rede são evolução posterior; não aumentam o escopo deste fechamento V1.
