# Entregabilidade de memória e cultura

O Acervo Vivo, a Rádio Comunitária e a Arte dos Territórios são três
experiências sobre a mesma raiz editorial: `comun_archive_items`. O contrato
em `lib/cultural-deliverability.ts` registra especializações, rotas, projeções
públicas e evidências mínimas sem criar um quarto produto cultural.

## Contrato comum

Todo item cultural publicável precisa comprovar:

- título, contexto, fonte e crédito;
- direitos ou consentimentos válidos;
- original privado e derivada pública revisada, quando houver mídia;
- objeto da derivada verificável;
- acessibilidade por texto alternativo ou transcrição publicada;
- território, pauta ou contexto de origem, conforme a experiência;
- estado editorial aprovado, próxima ação e trilha de auditoria;
- retirada, retenção e projeção pública sanitizada;
- ausência de original, contato, nota privada ou object key na superfície
  pública.

A Rádio exige transcrição publicada. Uma exceção só pode ser aceita quando
for explicitamente documentada pelo chamador; o estado `unavailable`, sozinho,
não é evidência de acessibilidade.

## Fonte canônica por experiência

| Experiência          | Raiz                  | Especialização                                  | Superfície pública   |
| -------------------- | --------------------- | ----------------------------------------------- | -------------------- |
| Acervo Vivo          | `comun_archive_items` | metadados editoriais do item                    | `/comun/acervo`      |
| Rádio Comunitária    | `comun_archive_items` | `comun_radio_programs` e `comun_radio_episodes` | `/comun/radio`       |
| Arte dos Territórios | `comun_archive_items` | `comun_archive_artworks`                        | `/comun/acervo/arte` |

Assets permanecem em `comun_archive_assets`. Agentes e créditos permanecem
em `comun_archive_agents` e nas tabelas de crédito especializadas. Vínculos
com território, pauta, ação e memória usam as relações já existentes.

## Separação operacional

O workflow `COMUN Cultural Deliverability` mantém canais diferentes:

1. PR: contrato, testes, build e verificações locais, sem credenciais remotas;
2. preflight/content inventory: consultas agregadas em transação read-only;
3. private rehearsal: dados sintéticos privados em transação revertida;
4. publicação real: não existe neste checkpoint.

Na execução diária, findings sanitizados são consolidados na issue única
`[COMUN] Entregabilidade cultural — findings`; a lane de PR não possui
permissão de escrita nem recebe secrets remotos.

Contagens de candidatos reais nunca significam autorização de direitos. O
domínio só pode ficar verde depois de Acervo, Rádio e Arte possuírem conteúdo
real autorizado, smoke público e evidência editorial explícita.

## Ensaio privado

O ensaio remoto cria um item privado de cada experiência dentro de uma única
transação, valida que `anon` não os enxerga e executa `rollback`. Nenhum ID,
texto privado ou object key entra no artifact. O ciclo completo de objetos de
Storage continua coberto pelos smokes locais específicos de Rádio e Arte.

## Gate terminal

- Técnica ou segurança incompleta:
  `COMUN_ARCHIVE_RADIO_ART_BLOCKED_<CAUSA>`.
- Produto, schema, RLS e ensaio verdes, mas conteúdo real sem autorização
  completa:
  `COMUN_ARCHIVE_RADIO_ART_READY_FOR_REAL_CONTENT_REHEARSAL`.
- Os três recortes com evidência real completa:
  `COMUN_ARCHIVE_RADIO_ART_GREEN`.

`launch_publicly` permanece fora deste domínio e exige decisão humana
terminal separada.
