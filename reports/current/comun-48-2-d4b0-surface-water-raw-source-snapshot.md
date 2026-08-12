# COMUN 48.2-D4B0 — Qualidade dos rios: fonte bruta RH III

Data da captura: 12/08/2026
Natureza: snapshot de dados oficiais versionados, sem UI, API, flag, migration,
deploy ou escrita Production.

Baseline: `3adf70101acc599cf509b1375eaaaf4fbc0b8916`.
Commit funcional: `026742913f1b9f02a1d3ab70e6846f00a026b435`.
Os PDFs baixados para a auditoria permaneceram somente como arquivos locais
temporários e não entram neste commit nem no snapshot.

## Decisão

`surface_water_quality = READY_D4B`.

O INEA publica os arquivos intitulados “Dados Brutos RH III” como PDFs
tabulares. Eles não foram tratados como planilhas: a extração foi feita por
parser específico, revisada visualmente e comparada com o resultado
normalizado. O snapshot ativo é uma fotografia de referência de **2025**, não
uma condição atual, em tempo real, avaliação de potabilidade ou conformidade
legal.

## Fontes verificadas

| Ano | Fonte oficial | Formato | SHA-256 | Uso |
| --- | --- | --- | --- | --- |
| 2025 | [Dados Brutos RH III 2025](https://www.inea.rj.gov.br/wp-content/uploads/2026/01/Dados-Brutos-2025-RH-III_ver-1.pdf) | PDF tabular, 9 páginas | `4c061d12c0f546345db4f2d4bbce499d7166e68074bb84bdca002e9dc8f4ca33` | Snapshot ativo de referência |
| 2024 | [Dados Brutos RH III 2024](https://www.inea.rj.gov.br/wp-content/uploads/2025/02/Dados-Brutos-2024-RH-III_ver-1.pdf) | PDF tabular, 10 páginas | `1d9bc2c180b965e9924dc68a2e4520a4b0180c472289820bba63c7a0dda46354` | Comparador de schema e de identidade |

Ambos preservam a cadeia de proveniência INEA. ANA permanece apenas como fonte
de consolidação/metodologia e não foi usada para duplicar amostras.

## Pontos e amostras de Volta Redonda

O arquivo de 2025 identifica dois pontos no município, ambos no Rio Paraíba do
Sul:

| Código INEA | Identidade canônica | Amostras 2025 | Coordenada |
| --- | --- | ---: | --- |
| `PS0419` | `surface-water:inea:PS0419` | 12 | Não publicada no PDF |
| `PS0421` | `surface-water:inea:PS0421` | 12 | Não publicada no PDF |

Foram normalizadas 240 medições: 24 coletas mensais × 10 parâmetros. Os
qualificadores publicados, por exemplo `< 2,0`, `< 0,10` e `> 24.000`, foram
preservados separadamente do valor numérico. Valores ausentes permaneceriam
`null`; não há conversão para zero. `PS0419` foi reconciliado com o boletim
anterior: Rio Paraíba do Sul, Volta Redonda.

## Schema e IQA

Os parâmetros extraídos do cabeçalho oficial são DBO, fósforo total, nitrogênio
amoniacal, oxigênio dissolvido, pH, turbidez, *Escherichia coli*, sólidos
dissolvidos totais, temperatura da água e temperatura do ar. As definições
versionadas retêm label, unidade e coluna de origem. O comparador de 2024
encontrou os mesmos dois códigos de Volta Redonda e os mesmos dez parâmetros;
a mudança observada foi apenas de largura/posição de página no PDF.

O IQA NSF foi preservado em uma coleção separada de 24 índices oficiais. Não
há cálculo próprio de IQA, nem classificação derivada pelo COMUN. Isso mantém
medição laboratorial e índice oficial como objetos diferentes.

## Limitações e segurança

- o PDF não publica latitude/longitude: nenhuma coordenada foi inventada ou
  geocodificada;
- novas versões do PDF exigem nova captura controlada, hash, parser, diff e
  revisão; não existe atualização automática;
- o runtime não acessa INEA, ANA, Sisagua ou qualquer fonte externa;
- não há dado de água para consumo humano, Sisagua, Relata, Carteira, conta,
  anexo, localização privada, encaminhamento ou endereço residencial;
- não houve UI, rota, API, feature flag, migration, deploy ou escrita de
  negócio em Production.

## Verificação

O parser `scripts/environment/capture-comun-surface-water-quality.py` foi
executado contra os dois PDFs oficiais. Sua saída de 2025 conferiu exatamente
com o snapshot versionado: 240 medições, 24 índices e os dois pontos acima.
Os testes cobrem hash, parser/schema, identidade, `PS0419`, duplicidade,
qualificadores, parâmetros desconhecidos, isolamento de IQA, drift 2024/2025,
ausência de import privado e ausência de fetch runtime.

Resultado: `COMUN_48_2_D4B0_SURFACE_WATER_RAW_SOURCE_SNAPSHOT_GREEN`.
