# COMUN - 48.2-D1A - Captura oficial de qualidade do ar

Data da auditoria: 11/08/2026. Baseline: `origin/main=b4bb26a39db6f2ed682c28e4f6c7ef5bb3e62240`.

## Decisão

`COMUN_48_2_D1A_BLOCKED_CURRENT_OFFICIAL_SOURCE_UNAVAILABLE`

`COMUN_48_2_D1A_BLOCKED_CURRENT_STATION_INVENTORY_UNVERIFIED`

O D1 permanece `PARTIAL_D1`. Não existe nesta revisão uma fotografia oficial atual verificável de estações de Volta Redonda. Por isso não foi criado snapshot, UI, rota, API, flag, migration, importação, adaptação de Relata, publicação ou escrita em Production.

## Captura controlada

| sourceId | classificação | URL oficial pública | resultado | rawSha256 |
| --- | --- | --- | --- | --- |
| `inea-sigqar-portal` | `dynamic_public_portal` | `https://portalsigqar.inea.rj.gov.br/` | HTTP 200; HTML público não contém inventário, estação, município, status ou medição de Volta Redonda | `58cc64051c21074006866ea1570e48578d2df55cd973c53c2b01ef632958afbe` |
| `inea-iqar-page` | `stable_public_html` | `https://www.inea.rj.gov.br/ar-agua-e-solo/iqar/` | HTTP 200; metodologia pública e referência ao boletim diário, sem dados correntes de estação no HTML | `0f88a93461c623496a247b93359b474dde1cc0c78c9a7a2bedd31c7a3bb98f22` |
| `inea-iqar-daily-bulletin-public-link` | `stable_public_document` | `https://drive.google.com/file/d/18XYm0jh3EdRxNVySAMk0JvBk5HwhkKwX/preview` | HTTP 404; o documento público embutido na página IQAr não está disponível | `8abba8b339b78257e7841d54a1da43040c9bf496cabe8e224b3b403785661554` |

As capturas foram feitas durante auditoria controlada em 11/08/2026. O portal dinâmico não foi investigado por rede, API interna, token, cookie, endpoint oculto ou engenharia reversa. O link do boletim foi obtido do HTML público da página IQAr e testado somente como documento público.

## O que a fonte atual comprova

- O SIGQAr é um portal oficial do INEA, mas sua página HTML inicial não fornece o contrato estável necessário para uma captura atual sem depender de mecanismo interno.
- A página IQAr do INEA explica o índice e lista PM10, PM2,5, O3, CO, NO2 e SO2 como poluentes do cálculo oficial. Ela não autoriza o COMUN a recalcular o índice.
- A página IQAr declara o boletim diário como resumo das 24 horas anteriores, mas o documento atualmente referenciado retorna 404; portanto não há concentração, subíndice, IQAr, classificação, horário, estação ou município verificável nesta captura.
- Relatórios INEA históricos continuam apenas como `historicalBaseline`. Eles não podem preencher `currentOfficialSnapshot`, `reportedStatus` ou disponibilidade atual de poluente.

## Inventário e lacunas

Estações atuais encontradas: `[]`.

Medições atuais encontradas: `[]`.

Não foi possível comprovar para nenhuma estação: `stationId`, nome oficial, coordenada pública, status reportado, poluentes publicados, meteorologia publicada, período ou freshness. Ausência permanece ausência: não foi registrada como zero, boa qualidade, estação ativa ou estação inativa.

`semanticSha256` não foi produzido: não há conteúdo atual de estação que possa ser normalizado sem remover semântica. Não existe `active-snapshot.json`, `air-quality-v1-YYYYMMDD.json` ou manifesto D1A porque tais artefatos sugeririam uma fotografia atual inexistente.

## Contratos preservados

- dados futuros deverão vir exclusivamente de fonte oficial INEA, por captura controlada, validação, hash, snapshot versionado e revisão; o runtime não fará fetch externo;
- concentração, subíndice, IQAr geral e classificação continuarão estruturados separadamente;
- a allowlist futura é PM10, PM2_5, O3, CO, NO2 e SO2; variáveis oficiais adicionais exigem revisão explícita;
- `meteorologicalContext != sourceAttribution`: não há inferência de emissor por vento;
- D1A continua `official_public_data only`; Relata ambiental privado, Carteira, anexos, localização privada, forwarding e conta não foram lidos nem importados;
- INEA aparece somente como `originalPublisher` e fonte de proveniência. O produto continua COMUN Ambiente / Observatório Ambiental.

## Próxima condição para retomar D1A

É necessário que o INEA disponibilize uma fonte pública atual estável que mostre ao menos uma estação de Volta Redonda com identidade, período e disponibilidade explicitamente publicada, ou que a página oficial IQAr corrija o documento diário público. Uma nova captura deverá criar candidato versionado e passar por revisão de drift antes de qualquer UI D1B.

Fontes: [SIGQAr/INEA](https://portalsigqar.inea.rj.gov.br/), [IQAr/INEA](https://www.inea.rj.gov.br/ar-agua-e-solo/iqar/) e [Relatório INEA 2019-2022](https://www.inea.rj.gov.br/wp-content/uploads/2024/10/Relat%C3%B3rio-de-Avalia%C3%A7ao-da-Qualidade-do-Ar-2019_2022.pdf).
