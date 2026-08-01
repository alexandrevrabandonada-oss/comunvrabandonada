# Qualidade integral do COMUN — 47.9C

Data da decisão: 31/07/2026. Alvo formal: WCAG 2.2 nível AA. Este contrato separa quatro evidências que não podem ser confundidas: laboratório automatizado, Preview, Production sintética e campo real.

## Resultado e limites

O máximo sem aparelhos e tecnologia assistiva reais é `COMUN_QUALITY_PERFORMANCE_READY_FOR_REAL_DEVICE_REHEARSAL`. `GREEN` exige Android físico popular, segunda plataforma física, tecnologia assistiva real e evidência de campo suficiente. Axe, Accessibility Tree e Playwright encontram regressões; não demonstram compreensão humana nem substituem TalkBack, NVDA ou VoiceOver.

As pistas continuam independentes:

- 47.9A permanece `COMUN_EXPERIENCE_COHERENCE_READY_FOR_USABILITY_REHEARSAL`;
- 47.9B permanece `COMUN_CIVIC_INTELLIGENCE_BLOCKED_PROVIDER_CAPABILITY`;
- `security_resilience` permanece bloqueado por recovery point durável e cópia secundária de Storage;
- `miniapps` permanece `in_progress`;
- `archive_radio_art` permanece `evidence_required`;
- `launch_publicly` não é acionado.

## Fontes normativas e operacionais

Consulta em 31/07/2026:

- [WCAG 2.2, W3C Recommendation](https://www.w3.org/TR/WCAG22/): percepção, operação, compreensão e robustez; inclui foco não encoberto, tamanho mínimo de alvo e autenticação acessível;
- [Web Vitals](https://web.dev/articles/vitals): LCP, INP e CLS como Core Web Vitals, avaliados no percentil 75 e separados por mobile e desktop;
- [Definição dos limites dos Core Web Vitals](https://web.dev/articles/defining-core-web-vitals-thresholds): bom significa LCP até 2,5 s, INP até 200 ms e CLS até 0,1;
- [Web App Manifest, W3C](https://www.w3.org/TR/appmanifest/): identidade, escopo, apresentação e atalhos da aplicação instalável;
- [Next.js Analytics](https://nextjs.org/docs/app/guides/analytics): `useReportWebVitals` isolado em um pequeno Client Component.

## Baseline antes da mudança

O baseline sanitizado está em `reports/current/comun-quality-performance-baseline.json`. Foi medido em Production, contexto frio, 390 × 844, sem throttling. Não é dado de campo.

Findings iniciais:

1. `/comun/ajuda` respondia 404;
2. `/comun/buscar?q=calcadas` gerava divergência de hidratação por formatação de data dependente do fuso e apresentou LCP sintético de 6,8 s em uma rodada;
3. Calçadas transferia cerca de 448 kB de JavaScript e tinha três long tasks, coerente com a classe de aplicação rica;
4. o logout enviava uma limpeza que não removia o cache público antigo;
5. PostCSS 8.5.12 estava no caminho de build afetado por advisory de leitura de arquivo via source map.

Correções são focais: ajuda canônica, data com fuso explícito, primeira busca lexical pela projeção reconstruível com `unifiedPublicSearch` preservada como fallback, cache v2 e PostCSS 8.5.25. MapLibre continua carregado dinamicamente apenas nas superfícies de mapa.

## Matriz de acessibilidade

| Contrato                                                        | Automação                                                  | Ensaio real necessário                   |
| --------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------- |
| Alternativas, headings, landmarks, labels, nomes/papéis/estados | Axe + Accessibility Tree                                   | confirmação de compreensão               |
| Teclado, skip link, ordem e foco visível/não encoberto          | tabulação e CSS forced colors                              | teclado real                             |
| Reflow, 200%, 320 CSS px, texto longo                           | nove viewports + fonte ampliada                            | zoom do sistema e navegador              |
| Movimento                                                       | `prefers-reduced-motion`                                   | preferência real do aparelho             |
| Login                                                           | autocomplete, colagem, erro e `returnTo`                   | password manager e sessão expirada reais |
| Mapas                                                           | fallback textual, controles, sem geolocalização automática | TalkBack/VoiceOver e gesto alternativo   |
| Player                                                          | controles nativos, título, capítulos                       | leitor de tela e mídia real autorizada   |
| Estados assíncronos                                             | `role=status`, `aria-live`, timeout                        | anúncio em TalkBack/NVDA/VoiceOver       |

Mídia publicada continua exigindo legenda ou transcrição conforme o tipo. A existência do player não torna conteúdo sem transcrição conforme.

## Viewports e dispositivos de laboratório

O gate cobre 320×568, 360×640, 375×667, 390×844, 412×915, 768×1024, 1024×768, 1280×720 e 1440×900, retrato e paisagem. As cinco primeiras configurações usam touch e DPR móvel; o Android de baixa capacidade recebe CPU e rede degradadas no ensaio focal. Memória limitada e teclado virtual não são reproduzidos fielmente pelo Playwright e permanecem no roteiro físico.

## PWA e fronteira de cache

Manifesto canônico: id e scope `/comun/`, start URL `/comun`, `standalone`, orientação livre, ícones 192/512, ícone maskable e quatro atalhos. Instalação é opcional, contextual e nunca bloqueia a navegação comum.

| Classe                                                                           | Política                                                            |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| manifesto, ícones, fallback offline, assets `/_next/static/`                     | shell versionado                                                    |
| página pública allowlisted, sem query, sem `Set-Cookie`, `private` ou `no-store` | network first; pode ser reutilizada offline                         |
| busca com query, admin, área pessoal, Inbox, conta, onboarding, confirmação, API | nunca entra no cache de conteúdo                                    |
| POST, PUT, PATCH, DELETE                                                         | service worker não intercepta                                       |
| logout, troca de conta ou limpeza explícita                                      | elimina todo cache de conteúdo, preserva apenas shell institucional |
| atualização                                                                      | novo worker é anunciado; ativação depende de ação explícita         |

Resultado focal esperado: `COMUN_PWA_PRIVATE_CACHE_BOUNDARY_GREEN`. O offline é honesto: leitura pública previamente armazenada pode existir; conta, protocolo recente, upload e qualquer envio exigem conexão. Não há fila silenciosa nem armazenamento offline novo de contribuição privada.

## Web Vitals privados

O Client Component envia somente nome, valor, rating, classe canônica de rota, mobile/desktop e versão. O servidor transforma o valor em bucket e agrega por hora. Não há coluna para URL, slug, query, busca, pessoa, conta, IP, sessão, cookie, texto ou histórico individual. A taxa padrão é 20%; o endpoint rejeita campos desconhecidos, origem cruzada e excesso global por instância.

Para aproximar p75 sem eventos individuais, buckets ponderados são calculados para cada métrica e classe de dispositivo. Campo só fica pronto quando LCP, INP e CLS têm ao menos 75 amostras em mobile e desktop. Sem amostra, a Central mostra “amostra insuficiente”.

## Orçamentos de laboratório

Os orçamentos foram derivados do baseline, por classe, e não alteram os limites oficiais de campo.

| Classe  | JS inicial |   CSS |  Imagens | Fontes | Requests |  Heap |  LCP lab | Long tasks |
| ------- | ---------: | ----: | -------: | -----: | -------: | ----: | -------: | ---------: |
| simples |     190 kB | 25 kB |   600 kB | 100 kB |       36 | 18 MB | 3.200 ms |          3 |
| visual  |     225 kB | 32 kB | 1.600 kB | 100 kB |       46 | 25 MB | 3.200 ms |          5 |
| rica    |     500 kB | 42 kB | 2.000 kB | 100 kB |       52 | 34 MB | 3.600 ms |          9 |
| mídia   |     230 kB | 32 kB | 1.200 kB | 100 kB |       46 | 26 MB | 3.200 ms |          5 |

Home, ajuda, segurança, pauta textual e resultado usam “simples”; Acervo, Arte e territórios, “visual”; Calçadas, mapa, busca e Central, “rica”; Rádio/player, “mídia”. Áudio iniciado pela pessoa não conta como transferência inicial.

O gate de orçamento mede sempre o build candidato em `next start` local isolado, inclusive quando é orquestrado pelo pós-merge. Production permanece no preflight, nos smokes e no no-leak, mas sua latência de rede e a quantidade variável de conteúdo publicado não são misturadas com o orçamento de laboratório. Amostras remotas frias continuam registradas como diagnóstico, sem relaxar os limites para fazê-las passar.

O envelope sanitizado de cada rota registra status HTTP, HTML inicial, JS, CSS, imagens, fontes, requests, heap, TTFB, FCP, LCP, aproximação laboratorial de interação, CLS, long tasks, erros por classe e presença de assets pesados de mapa. Bytes são contados pelo protocolo de rede do navegador, inclusive para assets cross-origin, sem gravar URLs. Os budgets de imagens e fontes são aplicados pelo mesmo gate de JS e CSS.

## Carga, rede e IA

O contrato materializa 25, 50, 100, 500 e 1.000 documentos públicos sintéticos em memória, valida paginação de 25 e deduplicação. Ensaios integrados continuam responsáveis por Supabase local, Inbox e Minha Participação; nenhuma fixture é publicada em Production.

Rede cobre offline, 3G lento emulado, reconexão, 503 da busca e provider semântico ausente. A busca lexical server-rendered aparece primeiro; enriquecimento pode falhar sem HTTP 500, narrativa inventada ou spinner infinito. A Edge Function de embeddings não é transportada neste tijolo.

## Evidência pendente

Mesmo com CI e Production verdes, restam quatro fatos de campo: Android físico, segunda plataforma, tecnologia assistiva real e amostra adequada de Web Vitals. Eles não são convertidos em “passou” por emulação.
