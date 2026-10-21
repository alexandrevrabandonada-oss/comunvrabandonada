# U0.1 — Inventário de superfícies e auditoria de coerência

**Checkpoint vigente: U0.2 — pacote candidato em revisão.** Inventário de páginas concluído; auditoria funcional integral ainda em andamento. Correções locais de rascunho, privacidade de tarefas e referências da Escola preparadas. Browser bloqueado por ambiente. O estado atual é este bloco; as seções seguintes são evidência/histórico.

Base inspecionada: `3694710f3b3b1d26031c7c87c52826798a88dbea`. Data: 13/10/2026 (Brasília).

Estado: inventário estático completo dos arquivos `page.tsx` sob `app/comun`; auditoria funcional de todas as jornadas ainda pendente. Nenhuma disponibilidade de flag, autorização ou persistência remota é inferida da presença de arquivo.

Total: **240 páginas**, em **46 famílias de diretório**. Administração e rotas dinâmicas estão incluídas. Não representa número de funcionalidades ou URLs concretas.

## Visão e regra de avanço

COMUN reúne vida cotidiana, ajuda mútua, economia solidária, cultura, conhecimento e organização de base. Oferta, troca e cultura têm valor próprio; não precisam virar denúncia. Interfaces compartilham contexto, privacidade, busca e retomada.

Sequência única proposta: U0 inventário → U1 operação solo/experiência comum → U2 organização de base → U3 economia comunitária → U4 ferramentas/observatórios → U5 formação/cultura → U6 distribuição → U7 ensaio solo → U8 participação real. Segurança, acessibilidade e recuperação são transversais. Esta proposta não revoga os contratos vigentes de lançamento.

## Achados sustentados por leitura

| ID | Achado | Efeito provável | Próximo passo |
|---|---|---|---|
| U0-F01 | `docs/comun-navegacao.md` e `docs/comun-arquitetura-informacao.md` definem menus principais diferentes | Decisões futuras podem perpetuar experiências concorrentes | Comparar contratos executáveis e shells; escolher e documentar a referência vigente |
| U0-F02 | Feirinha em `app/comun/cooperativas/page.tsx` exibe modalidades econômicas, mas se declara descoberta sem pedidos/pagamentos | A promessa de ajudar a vender/trocar exige mais que catálogo | Rastrear descoberta, interesse, contato consentido e encerramento antes de recomendar novo mecanismo |
| U0-F03 | Feirinha condicionada a flag; código organiza ofertas por organizações | Não comprova anúncio individual nem disponibilidade atual | Inventariar flags, ações, adapter e provas existentes |
| U0-F04 | Contrato de miniapps exige contexto e retorno comuns; pauta possui registry própria | Boa base para ferramentas integradas, risco de duplicação se ignorada | Reutilizar registry e carteira; conferir cada especialização |
| U0-F05 | Observatórios documentam validação humana antes de agregação/publicação | Automação não elimina responsabilidade editorial | Preparar revisão operável por uma pessoa; manter publicação não aprovada fechada |
| U0-F06 | Barra móvel possui label Participar apontando a `/comun/pautas`, enquanto há rota `/comun/participar` | Possível ambiguidade de intenção; ainda não certificado como defeito | Comparar comportamento, teste e decisão de produto em ambos os modos |

## Critério crítico

Nenhuma ideologia garante uma boa experiência por si. Autonomia exige regras explicáveis, saída, privacidade e decisões revisáveis. Baixa fricção exige poupar trabalho cotidiano sem remover consentimento. Volume de páginas, commits ou testes não demonstra utilidade nem poder comunitário.

## Cobertura do inventário

| Família | Páginas |
|---|---:|
| `(início)` | 1 |
| `acervo` | 22 |
| `acoes` | 2 |
| `acompanhar` | 3 |
| `admin` | 99 |
| `ajuda` | 2 |
| `arte` | 6 |
| `busca` | 1 |
| `buscar` | 1 |
| `c` | 2 |
| `caixa-de-entrada` | 1 |
| `calcadas` | 7 |
| `campo` | 3 |
| `completar-conta` | 1 |
| `comunidades` | 1 |
| `conta` | 2 |
| `cooperativas` | 11 |
| `criar-conta` | 1 |
| `denuncias` | 3 |
| `dossies` | 2 |
| `entidades` | 1 |
| `entrar` | 1 |
| `escola` | 6 |
| `explorar` | 1 |
| `mapa` | 4 |
| `minha-participacao` | 1 |
| `observatorios` | 21 |
| `offline` | 1 |
| `onboarding` | 1 |
| `onibus` | 1 |
| `participar` | 2 |
| `pautas` | 6 |
| `preview` | 1 |
| `projetos` | 2 |
| `protocolo-popular` | 1 |
| `radio` | 6 |
| `reciclagem` | 1 |
| `recuperar-acesso` | 1 |
| `redefinir-acesso` | 1 |
| `relata` | 2 |
| `relatar` | 2 |
| `resultados` | 1 |
| `seguranca` | 1 |
| `territorio-tomado` | 1 |
| `territorios` | 2 |
| `transporte` | 1 |

## Evidência por arquivo

Todos os arquivos abaixo foram enumerados; seus conteúdos não foram integralmente auditados. Hash permite detectar alteração da base. O caminho é fonte, não garantia de URL acessível.

| Família | Arquivo | SHA-256 |
|---|---|---|
| (início) | `app/comun/page.tsx` | `faec82be50b80ff7d9ae5858acbfc731fd085f0010ae7229f6d10047daff2b6c` |
| acervo | `app/comun/acervo/[slug]/page.tsx` | `e12e147933197941bf2ae7c20d24a69c9dc5fb95f89362f030352187f232d794` |
| acervo | `app/comun/acervo/arte/[slug]/page.tsx` | `5dc04a647407a3508746ba049305549f1e8e0208e69678abfd2a4b993f1f358c` |
| acervo | `app/comun/acervo/arte/contribuir/page.tsx` | `9ab498e19ba7e6d0ff605ab2721eba0dd56b111b244f3daec373ccb8677d0c43` |
| acervo | `app/comun/acervo/arte/criadores/[slug]/page.tsx` | `1b28521aafd37f9a7ed1d2cf9677520adc5d81f2137a10f06fe02f874287d634` |
| acervo | `app/comun/acervo/arte/direitos-e-retirada/page.tsx` | `b4d313e36b5db3203a18e16129e7beb79bf2ace7d0b86e494657b82f79eddf2a` |
| acervo | `app/comun/acervo/arte/page.tsx` | `4918baa05cd075ca1ed03f0488c40bc13e922dc2dc3f6ce9d1fdcfc567541faa` |
| acervo | `app/comun/acervo/artistas/[slug]/page.tsx` | `ea75683599a9557a6c40f38ceb0f36937c7e185916ab95a8921e8f190677fd62` |
| acervo | `app/comun/acervo/artistas/page.tsx` | `6deeb011a9046e8816bce78ecd8b50922e7b7cdb02603d1f1399b9d2a574b802` |
| acervo | `app/comun/acervo/colecoes/[slug]/page.tsx` | `b90f93374ccf9fe218f7f2dd8759f46cac499cbb3906ce1afcde9df120472e90` |
| acervo | `app/comun/acervo/colecoes/page.tsx` | `513ceff08fe3f0a5f5d938f379d9fb9b9b4725ced388511ce7bbbcf82117a846` |
| acervo | `app/comun/acervo/contribuir/artista/page.tsx` | `67c49cbd7fe5cecc06685c1fc38957fc039845180c69f0fe3931e15cf2e3b1fc` |
| acervo | `app/comun/acervo/contribuir/page.tsx` | `fed00353232e408f7059cbffbfdf0b9ea440262a91949b157870304359fd6cb0` |
| acervo | `app/comun/acervo/direitos-e-remocao/page.tsx` | `fab7e987e5bd30af4cc24435c07168dd0d7b5e7c9ef1b24bdb9c7a543dd33f71` |
| acervo | `app/comun/acervo/historias-orais/[slug]/page.tsx` | `63d7b83c9460133ce7fed85f8d78b79d7400b865f3ee5dc3f42005f4b77caf8b` |
| acervo | `app/comun/acervo/historias-orais/contribuir/page.tsx` | `e3744752f8a289acf8550f61a93dac593f542b09e59c504265c8b0218cad890f` |
| acervo | `app/comun/acervo/historias-orais/direitos-e-retirada/page.tsx` | `7c5e0bf0ccec430a1e60cde7c2ee6a1c6987341fb823c50c1bc791a8673594de` |
| acervo | `app/comun/acervo/historias-orais/page.tsx` | `e569eb02fd560b9a786f2791496b82241585d4a012172a5705138b00300482d0` |
| acervo | `app/comun/acervo/identificar/[slug]/page.tsx` | `043da806a3f32aab77ebfb6aa27d9876281d1da738502eded4401d27e9b8f2e3` |
| acervo | `app/comun/acervo/identificar/page.tsx` | `a4568a3801d4fdf0b3e3db9d14319cf552952fc9ab52d486992b471774fd8e55` |
| acervo | `app/comun/acervo/musica/[slug]/page.tsx` | `6930902cf43829184efb39b99020509b091a42578ecfe0b996968b40e4e5988a` |
| acervo | `app/comun/acervo/musica/page.tsx` | `cc53ef2f191789530d0c73677862017b8ae3b0178487c26992741fc5514e0301` |
| acervo | `app/comun/acervo/page.tsx` | `2535a9233e70bab365c51e9f7fc301af41cb99a411be1ac8ef42793190e78571` |
| acoes | `app/comun/acoes/[slug]/page.tsx` | `fb61fd83699964c5f6e30aa1e0f6327fcb5de36129e176789627283bb759d7e1` |
| acoes | `app/comun/acoes/page.tsx` | `006ec2df4e2a7d0415104f9aca511a26c25a0b168b742608bcb430084cafa29f` |
| acompanhar | `app/comun/acompanhar/[protocol]/ouvidoria/page.tsx` | `680b065cea7d98d11fb3908e7b447d40c9c66a7d12230a6a8f0ed9859d2f755e` |
| acompanhar | `app/comun/acompanhar/[protocol]/page.tsx` | `093ca9823cd17a7aadc2225c3bad8b1ebf5cccf2270aa7d294e23f6766f54fb6` |
| acompanhar | `app/comun/acompanhar/page.tsx` | `33fcfebf0f98e1bd23ea0bc3bfcb6378c885c9e901953ab17a6f8cab35bd74a4` |
| admin | `app/comun/admin/acervo/[id]/page.tsx` | `184e3857e24adf9a03a4da4feba91727a85d3cbccc7b84980cfec35125a3c6bc` |
| admin | `app/comun/admin/acervo/arte/[id]/page.tsx` | `8bc2cd2074e9b5fef61ed4eae4c8e1fd782f8b41f7144e13d1e15d65d48f7021` |
| admin | `app/comun/admin/acervo/arte/contribuicoes/[id]/page.tsx` | `9cc858035dba2b0a309422b7b8e115c46552d119b5803e843dfe7705896c676a` |
| admin | `app/comun/admin/acervo/arte/contribuicoes/page.tsx` | `d7d2cd08a14d954aad6351ee7fa0bb21e69bc4374d163089b478a1638f65ae8d` |
| admin | `app/comun/admin/acervo/arte/creditos/page.tsx` | `9821153c569eb010263ec18bea007c59e30c50a8c173d75ac66f3904d0928562` |
| admin | `app/comun/admin/acervo/arte/direitos/page.tsx` | `63415c5b34de838c3b55a96c52c7cdc3260c1c096fbb43700f298409c6635acc` |
| admin | `app/comun/admin/acervo/arte/novo/page.tsx` | `cc0fad5b0a75694f62683bcfb5140dca959cc4a9474038b1c45982fd84ca171e` |
| admin | `app/comun/admin/acervo/arte/page.tsx` | `6ea312b7f736c14e1f8a6b6aa964b578001917597747412fa4de1f2706a0addb` |
| admin | `app/comun/admin/acervo/artistas/[id]/page.tsx` | `f3a1f698b8aee56cc41ed5d93c51bb7719cc243aa36a6afc1fe06a56a21dc270` |
| admin | `app/comun/admin/acervo/artistas/contribuicoes/page.tsx` | `828340f2ebb9057e82b6e38e06b501a272ba08be6b6056d1385391a64bee3cd8` |
| admin | `app/comun/admin/acervo/artistas/page.tsx` | `80cc4b4211d4a657254f060bedd1a3a2e4c93c349eaec4bd9028bfeffdce7d38` |
| admin | `app/comun/admin/acervo/artistas/pendencias/page.tsx` | `f0d1a33060cbd315853cb09be4a40767dc5080f0dcbbcd5ff1e0d308fa876f9a` |
| admin | `app/comun/admin/acervo/artistas/reivindicacoes/page.tsx` | `3ce4eef599803a0987e1bdc70b4d3df601a6245253f94b2825086f1a0e8cd7d1` |
| admin | `app/comun/admin/acervo/colecoes/page.tsx` | `4a90b4400089d735ffb3fec874e46496bacdfecbcd9e943b4ba425038b484dc8` |
| admin | `app/comun/admin/acervo/contribuicoes/[id]/page.tsx` | `573dbefcd1c39ea6714fdfac23ff4c8869651a1519fc8accc4e79a58e030013a` |
| admin | `app/comun/admin/acervo/contribuicoes/page.tsx` | `6526c06d214c6520f24cdd088cfcc6dad834ede3af008df1924d9efd55abc1d4` |
| admin | `app/comun/admin/acervo/historias-orais/[id]/page.tsx` | `a4ffe89fd031f7419ae5a728b8994af1e9125b3f21e8c2f9d63c76a425aeceaf` |
| admin | `app/comun/admin/acervo/historias-orais/consentimentos/page.tsx` | `4256514b31a1cce1e4113cde5749584b4d826fdf421774f59c47796082c2f553` |
| admin | `app/comun/admin/acervo/historias-orais/novo/page.tsx` | `0fb146b5d13e29b7a93d1ab04ade4ddd84facecfc13890343a1f82ed861b1a28` |
| admin | `app/comun/admin/acervo/historias-orais/page.tsx` | `ed28ef453e506e873352c1d7fd34c8560de2845862bc64ee21d1645023fd05f8` |
| admin | `app/comun/admin/acervo/historias-orais/piloto/page.tsx` | `563ca03a1f61416cd52d9a18a0f4f40c084d299246fd2f1c22924ee099531fae` |
| admin | `app/comun/admin/acervo/historias-orais/sugestoes/[id]/page.tsx` | `fe43c7329edb69bcf695a176a21239f92ab3ca5596d3c927d1ade951ab19e80f` |
| admin | `app/comun/admin/acervo/historias-orais/sugestoes/page.tsx` | `43fc92db9ac3b4ea6d9f14a6c9a6ad9880da21043307189d11d5e994dea5caa1` |
| admin | `app/comun/admin/acervo/historias-orais/transcricoes/page.tsx` | `545c7ab67dfb88e84df89fba11694f9f1b2ff72efd7b34d24a92923a376b532b` |
| admin | `app/comun/admin/acervo/historias-orais/transcricoes/trabalho/page.tsx` | `1250549776aaa4c2a09b3b22238a92f8179daeafd76d28fcca5f724c24b745a0` |
| admin | `app/comun/admin/acervo/identificacao/[id]/page.tsx` | `1ca316a3cbda0684ca41ab9a6b9118f21d4ca3071116365df5d4d816dc894389` |
| admin | `app/comun/admin/acervo/identificacao/page.tsx` | `6e4fe7c2c7b04bfdcc65b0243cbcda548d3fd32155b2e7d3f7c9ecc630d54c13` |
| admin | `app/comun/admin/acervo/musica/[id]/page.tsx` | `b4d0cd38bf6a71da55253dfe21333752b30b811ee7cfac48bd8a25bd6d8f30af` |
| admin | `app/comun/admin/acervo/musica/observabilidade/page.tsx` | `35487270460e684e325cbeb3aa2fbfecf1700dc97cc4e6a99028ef732d0037cd` |
| admin | `app/comun/admin/acervo/novo/page.tsx` | `b1062f7b578b9f7fe45706b6e0335e905a79d1e4a80823cc26fa29b627b76ced` |
| admin | `app/comun/admin/acervo/page.tsx` | `0e44be255c391ca2fb0b1a64c156e88c875e9b5db05aa46c56bf1ca02a3c14e3` |
| admin | `app/comun/admin/acervo/processamento/[id]/page.tsx` | `e73120cb0ab7fc6b1bebea27f37190daf8da056608489a752f1a96e739d4edfb` |
| admin | `app/comun/admin/acervo/processamento/dead-letter/page.tsx` | `ed1e1f74060b6ecdcb1b4bd6fc8cb85bb63e3d9305d17e8523d5f7a575cb2bde` |
| admin | `app/comun/admin/acervo/processamento/page.tsx` | `96d07800f3973a677541a3c750c7b8f400e0937ebedde0f7f20929eda554809f` |
| admin | `app/comun/admin/acervo/storage/page.tsx` | `8238a22d27ee8406eadea107c6dbc15518b5553561abc8cf8b1fc49dd88cc156` |
| admin | `app/comun/admin/acervo/sugestoes/page.tsx` | `ecb4ed8076b6c8c44435de0b26ea3ed7a93052441b3c26fa8e5bc4daf673a436` |
| admin | `app/comun/admin/acervo/verificacao/page.tsx` | `e906c2ad0995adbe72289cf2b7d8a3ba27ebf350eb46363bb3ce3ad6dea421e9` |
| admin | `app/comun/admin/acoes/page.tsx` | `cae5e1da207447dab4a649e88d9380b90e77da518f278c7c86fffd13b7344ff0` |
| admin | `app/comun/admin/alertas/page.tsx` | `48985e39755b1c70ab7e54e4e0d19144296d4b1f3d2b9ff0b72c52b577135dba` |
| admin | `app/comun/admin/anexos/page.tsx` | `e28cd51d55cc4b387de96c72704e753cb0bd6d880ddffbb312c53bcbeef80b33` |
| admin | `app/comun/admin/auditoria/page.tsx` | `0a435f08c137e24f15861af348a3d64946a097cd7192b839ce493b1b5cb4e544` |
| admin | `app/comun/admin/calcadas/encaminhamentos/[id]/page.tsx` | `ef1655ace69fc07e5d24caa2ac1d70c5a997516a4b07b4adaddbe3399ebec682` |
| admin | `app/comun/admin/calcadas/operacao/page.tsx` | `3c3056fd0dee80d3ccb8caa15eeb648ec6cae2ec5c65f93c7446f9d1ce937427` |
| admin | `app/comun/admin/calcadas/page.tsx` | `92acc2f4e2310c941f573562877eee3d9b2c448c5ed13b7fbd933dc1f0b21747` |
| admin | `app/comun/admin/calcadas/piloto/page.tsx` | `66c807b7daf266a606f8b644628ae18f3871b94f5a1488a9ad61cdfa3974bffc` |
| admin | `app/comun/admin/calcadas/prioridade/page.tsx` | `c29853ae356a635d3522e67468ed040aed7f6680518d258c80ffd4f7041861b3` |
| admin | `app/comun/admin/calcadas/relatos/page.tsx` | `3a8d2d7b8b3e100a7f28fecd61d776c8e5e4acd6d813d4365f31a6a0bd4dbf2c` |
| admin | `app/comun/admin/comunidades/page.tsx` | `026fdcf965ef14bc653f4a6d6bd38e28091770c88af9d2e61f6bbe2c0736d152` |
| admin | `app/comun/admin/curadoria/page.tsx` | `d8285b55c5c0c9ee4b471e39c7c4752512254507891d61dd39a72b75a794debf` |
| admin | `app/comun/admin/dossies/[id]/page.tsx` | `c0308c98657c76a49e03b01215e07ffb2213cb0c36cd5c9bdbf8123df89b0579` |
| admin | `app/comun/admin/dossies/[id]/preview/page.tsx` | `647deba5e736c7a1a89dced7170bef5219c277feac227d1973a723250b73f0bc` |
| admin | `app/comun/admin/dossies/page.tsx` | `4271c87cdb89a29fe9cd523dd117b65ec3c80e52482f530d13e1615cf113207d` |
| admin | `app/comun/admin/dossies/revisoes/page.tsx` | `1c706793b8eed9b3f165d11afde1f497fa194137b779af52f9b25722c58fc7a9` |
| admin | `app/comun/admin/entidades/page.tsx` | `95e3232f574d201a4ad200ca8635ceeb83e4280b624a7572b294f6bb09d29a2a` |
| admin | `app/comun/admin/entidades/revisao/page.tsx` | `e95f95d5912640dc379f4f0f2d4f59b55728e6186d5c7c340ee3ed1d2106e543` |
| admin | `app/comun/admin/equipe/page.tsx` | `e48f61844a5fb34da569be0b0079d0b732ff28092b1ac21abd8c776ce55b8b88` |
| admin | `app/comun/admin/escola/page.tsx` | `dccbcd183e54a4a6317231eb64eb0465b4af7fa540476d6b75b1562e2bae1184` |
| admin | `app/comun/admin/lancamento/page.tsx` | `84c23424de33c067f544b878962020877a07ed288c52c6b34fec8435eb2a3e31` |
| admin | `app/comun/admin/login/page.tsx` | `84093e460d7b9f9a2c74ab53741c4ef9086392f0296a2aaa586344dfcdf67122` |
| admin | `app/comun/admin/notificacoes/page.tsx` | `3a3b260f94eff13c50b4785a0fe85cc83c5f8c32f6fd575a693cfbd4ec20dd2d` |
| admin | `app/comun/admin/observabilidade/page.tsx` | `f6e9bdd50104e4ea561a5d5947e2e7f0ed93fbdf86710fcecfc7ab7634aee346` |
| admin | `app/comun/admin/observatorios/[id]/campanhas/[campaignId]/acessos/page.tsx` | `569f7f8fa0e3711ac976b51a26ed8cb571e2eb1b96cea9c173466fbf0f5d24e6` |
| admin | `app/comun/admin/observatorios/[id]/campanhas/[campaignId]/page.tsx` | `c7e49d4e74219659deeca9afc51402aaa6c24912801cef830b157f2381ce4165` |
| admin | `app/comun/admin/observatorios/[id]/campanhas/[campaignId]/prontidao/page.tsx` | `7c7cdc2168af49d034346b3ba01e18d8c8130f9fc8f6420d322668cd1d330b75` |
| admin | `app/comun/admin/observatorios/[id]/metodologia/page.tsx` | `d0ac453257bb997aa94e0a984aabc66d902d37ea6958b085dc51efe123d9ed0a` |
| admin | `app/comun/admin/observatorios/[id]/metricas/page.tsx` | `d0ac453257bb997aa94e0a984aabc66d902d37ea6958b085dc51efe123d9ed0a` |
| admin | `app/comun/admin/observatorios/[id]/observacoes/page.tsx` | `d0ac453257bb997aa94e0a984aabc66d902d37ea6958b085dc51efe123d9ed0a` |
| admin | `app/comun/admin/observatorios/[id]/page.tsx` | `0c3cfb7afb25333927369c7365c38e4023517e22aa84303057c6289590251b42` |
| admin | `app/comun/admin/observatorios/page.tsx` | `682aa27873054567676acc609ad246328e2c8633f80e203d27ca99493cc06a6d` |
| admin | `app/comun/admin/operacao/[id]/page.tsx` | `3cdf2d5230ebbc8b2c16e80dddb7564f4a12cdc42889abe8775462dd1f79d509` |
| admin | `app/comun/admin/operacao/page.tsx` | `a3d72999bf9e4f7fdaf9811c4f1f5fcea26c04207055dff25c85dd4878bf212a` |
| admin | `app/comun/admin/operacao/superficies/[surface]/page.tsx` | `53395bb9de5f28298c0d09d904f24509162c5af896a5583a7d47a37e4279f356` |
| admin | `app/comun/admin/organizacao/calendario/page.tsx` | `a44185ddb86adf40c24965033ac690384a6eed658a5447166bf0f1012b39f0de` |
| admin | `app/comun/admin/organizacao/entrada/page.tsx` | `552fffaf33ea4884c81833093b4fb9ad866accc556fabb970fd61ebea29c0dd2` |
| admin | `app/comun/admin/organizacao/entrada/vincular/page.tsx` | `bd2c35c453c4b9b473e9076a37614f68b3ce4d4dcbee8075d8b6f1fa64e0fa51` |
| admin | `app/comun/admin/organizacao/page.tsx` | `384a428ab3421e9395fd6e609a0b2c73c33d26858613c65287a9e8d4217f33b0` |
| admin | `app/comun/admin/page.tsx` | `0fd75795a7a15deea3f22f36f2ca872eec7a784acecceb38a6037f87f61a6754` |
| admin | `app/comun/admin/pautas/[id]/aplicativo/page.tsx` | `36336a83548941b6c2cc613ec810d3571bfb331030b2710f082c1ae03e1b9c42` |
| admin | `app/comun/admin/pautas/[id]/page.tsx` | `ef7a76848c511db28b046e566c4adebbddd7a355c918428257f649114e16691f` |
| admin | `app/comun/admin/pautas/contribuicoes/page.tsx` | `0fba247030d802455621323b4706dbc6d7a93d47b29851d5fd5a66f02eaf3f42` |
| admin | `app/comun/admin/pautas/page.tsx` | `45f1a4a4edecdee68e28bc62e64a95e7ca63c51f9c729bd75f1ef0a7ad20b7ce` |
| admin | `app/comun/admin/protocolos-oficiais/page.tsx` | `b506cddd7071150badc990e6609ac45651b4365173fdc722001aac6916059b18` |
| admin | `app/comun/admin/radio/consentimentos/page.tsx` | `cae86c9f37dc967fdf1bfb341b0317c091bd289ae35b8315f7a150b752adcbe9` |
| admin | `app/comun/admin/radio/contribuicoes/[id]/page.tsx` | `0ea5d648d8457dfac651ae0dd16c5e7c7c70d3b0e9b60cebe7ae0942394a2679` |
| admin | `app/comun/admin/radio/contribuicoes/page.tsx` | `746ca5b4bc5a95cce79a901ed8617753be39b7c57f28a5e78ca2debc5aa07dd1` |
| admin | `app/comun/admin/radio/direitos/page.tsx` | `4363dc70aa1a7ba538ef54d80dbae46463ab1e5bedb3482e2700e7bc03e184b0` |
| admin | `app/comun/admin/radio/episodios/[id]/page.tsx` | `0ff50ee7a9f3533b068526f0e2fef33f52c77848c5e945b22509fd157923637c` |
| admin | `app/comun/admin/radio/episodios/novo/page.tsx` | `9f980200313f0ae1dfbbe78f182a7d04bd0074c49ce22d4ace5e12ae811ec1f3` |
| admin | `app/comun/admin/radio/episodios/page.tsx` | `b646fb0225e89ec33bf6688aa84a46e3d6351d3de30a70415912f2ff09e7d03a` |
| admin | `app/comun/admin/radio/grade/page.tsx` | `ba38271e759a94db5d8a58b6f5064c2fded3ca5f574c1b7a8889ef59bc64047f` |
| admin | `app/comun/admin/radio/page.tsx` | `b7d0abf8f97967942194f81c2ba0e6b818b93aed44239d14317492cde8c8d2ce` |
| admin | `app/comun/admin/radio/programas/[id]/page.tsx` | `fcda4c24e4e3ea2f5e8c06accd92dc94e34a8b2f18abb7e4283a0a20199951ad` |
| admin | `app/comun/admin/radio/programas/novo/page.tsx` | `a1d7081dc5207ec095ab6fbdc6e63a4812c45f3f606759a02c6d8c9eaefa9693` |
| admin | `app/comun/admin/radio/programas/page.tsx` | `5b08dce75a0dda917368df8b3b8a0e5d47e5a2c83f63fa06c0154992ed57f1a9` |
| admin | `app/comun/admin/relatos/[id]/page.tsx` | `845f869acbaf3f2b9c1b248cd2063ea6992a4e628e6ee3d9897d2a9451dbd14f` |
| admin | `app/comun/admin/relatos/page.tsx` | `ed1e1f74060b6ecdcb1b4bd6fc8cb85bb63e3d9305d17e8523d5f7a575cb2bde` |
| admin | `app/comun/admin/rodas/[id]/page.tsx` | `6e31c8589547884c2b9cedda201723a2fcb5782b41a122e0ae36eb98e448d1b5` |
| admin | `app/comun/admin/rodas/page.tsx` | `38507c8a1cde0563c8266736463a15706d7cab4b5721b36a4376edbde996726b` |
| admin | `app/comun/admin/territorio/page.tsx` | `a0133866fb70bc24981a48180cfbcd252620108743ba878d2091c214d3bff75e` |
| ajuda | `app/comun/ajuda/page.tsx` | `c8b3e2aba55db3c39d6f06de72d1f4ac7b2ac0d74fdff30a8047aa9241bc01dc` |
| ajuda | `app/comun/ajuda/primeira-acao/page.tsx` | `4b487f09c5f61ed6d721b95939a856407335a1b3ad00d3100fd215d2bfd26512` |
| arte | `app/comun/arte/[slug]/page.tsx` | `688e3d3521d55727a9836247b63916cc39e299d1d033de124de10c91a6f1b34e` |
| arte | `app/comun/arte/colecoes/[slug]/page.tsx` | `522e74f7fd51eb61992fb0b9e58c93d755be7df7e3a20ad56bcaf175f6be205e` |
| arte | `app/comun/arte/contribuir/page.tsx` | `08976ed1867a520116e54b8469d49b9bdf97b0c3f021290e2553d41847fcd1f4` |
| arte | `app/comun/arte/criadores/[slug]/page.tsx` | `95553aae93023695cfc971bfdcc46a83383460b90519b4bda0a45ec782ae11ad` |
| arte | `app/comun/arte/direitos-e-retirada/page.tsx` | `aeb00e7dd152318840a0ee07b3db54d1ae44a5f49543eecf0c4aa7d86ab29de1` |
| arte | `app/comun/arte/page.tsx` | `8977ccf21c40007a53313ec120768018ba48a788a98980eaaaabefd0f3446c35` |
| busca | `app/comun/busca/page.tsx` | `e3d25a10426b19cd2d07142fd4337b09e80803854b589217355d1d9e565519e7` |
| buscar | `app/comun/buscar/page.tsx` | `65297d24952302a6b8ed236931c34af8dd6fe7fe273abad005df9b0191fbeda1` |
| c | `app/comun/c/[slug]/page.tsx` | `5fc72b79c4b5a9423031ea6150d0e4118db91a2607cab85873bee01f82019355` |
| c | `app/comun/c/[slug]/participar/page.tsx` | `b5444c021276f4a24649e0634130fe8f423acc185bfafd6bdd0a2c7bba98de12` |
| caixa-de-entrada | `app/comun/caixa-de-entrada/page.tsx` | `06bc15b3f014b3ce6dce0735e0b009a41c4c823c37b4d909fbbab4a598fb98ff` |
| calcadas | `app/comun/calcadas/contribuir/page.tsx` | `c6f2bc6e7c39e2821f76e2782235250f4cf400bc52b63fc5ed09083611a4cfa4` |
| calcadas | `app/comun/calcadas/mobilizacao/page.tsx` | `590acc46e804d19d6a835928fb56b53574c158746829c9af81ee4782111567d3` |
| calcadas | `app/comun/calcadas/page.tsx` | `ca3fc59eab77758909a9e9f7a059bc8b744bb88ae28f6b8f20020087a965ac53` |
| calcadas | `app/comun/calcadas/pressao/[id]/page.tsx` | `2ab9932898be1037ba010de251ba606af521061edca2c93e9be0dda570a3ec6b` |
| calcadas | `app/comun/calcadas/prioridades/page.tsx` | `c17e09a9aa005661df4aa1cfc1261705ca40a0d86820d9695f95496dbb5d814f` |
| calcadas | `app/comun/calcadas/registros/[slug]/page.tsx` | `43e8188dbb18c815373e67748a3c07ee427f8baf2a2251d32b7f98d71d46bfa4` |
| calcadas | `app/comun/calcadas/resultados/page.tsx` | `650a3a424ddac0c48f331df19dd7a117673b27364aa045d48867e87a6b632693` |
| campo | `app/comun/campo/page.tsx` | `aef4034c8455660e9a04c56ed6647da67ecd30c63fbf5a46b374c2bf024237cb` |
| campo | `app/comun/campo/turno/page.tsx` | `6470580edca094a59a849880a17990008fae46cfdce6d99bf7752cbed9b9b9dc` |
| campo | `app/comun/campo/turno/registrar/page.tsx` | `7efc6217d963e4c813898c70ce02c82ebcc87de864ce1304ebab0ae2b04fdd22` |
| completar-conta | `app/comun/completar-conta/page.tsx` | `806c9a997430cf38336055d2bae4ed67fe3811c73e2e0abfe3c58c4adbaeceb6` |
| comunidades | `app/comun/comunidades/page.tsx` | `c2e2138839d1282aaf724712de5ee87acb155d9ba1da7b00a8556366165ac8e3` |
| conta | `app/comun/conta/page.tsx` | `1cdbbeaaa7c25bec3be6ca28098ee9fe5438504fb956477c98aaaebcecb3dd09` |
| conta | `app/comun/conta/privacidade/page.tsx` | `ecba2f16d77003ed9c9c2849c47c21da506c542ab48b9d11690add9727dadd01` |
| cooperativas | `app/comun/cooperativas/[slug]/editar-perfil/page.tsx` | `ac780f7209fa42f82fcdfe67f991ce4b4a1d39eba5a442530c32a5a894c4c1e8` |
| cooperativas | `app/comun/cooperativas/[slug]/necessidades/[needSlug]/ajudar/page.tsx` | `b371a4d45176b3f2bcb8c5fbe2e288b0babd458275ee9ff036545d9a171a1b28` |
| cooperativas | `app/comun/cooperativas/[slug]/necessidades/[needSlug]/editar/page.tsx` | `c0fe11d7ce53a600f88f83624327080161881bbbe602c9f02c744d22ebc970fe` |
| cooperativas | `app/comun/cooperativas/[slug]/necessidades/nova/page.tsx` | `ba55da24019b6ba77e1fcb21aa74fa97edecaa26be90d0c38f1a61857077dcf1` |
| cooperativas | `app/comun/cooperativas/[slug]/ofertas/[offerSlug]/editar/page.tsx` | `3dbaeee3c1847c67d12979fa90dc0d8b5f2fe848545e6997858187809403ed25` |
| cooperativas | `app/comun/cooperativas/[slug]/ofertas/[offerSlug]/interesse/page.tsx` | `5f80c8b77519f4a023b0eec8d7a6d9f667ab8391329e0be4424d71bcc44272c9` |
| cooperativas | `app/comun/cooperativas/[slug]/ofertas/nova/page.tsx` | `9726197699d90806bee342e0821e2a0de20503133cd6d841bb6cc9c4d05bc364` |
| cooperativas | `app/comun/cooperativas/[slug]/page.tsx` | `187638361dc0e89f9960a92be69a4102b42011fbc8dc6f626700c31a037dc8a2` |
| cooperativas | `app/comun/cooperativas/nova/[onboardingToken]/page.tsx` | `2d0499f2549adc1e6201b58bbd7225e01a99bdd24eb98b836d3c425c429df80a` |
| cooperativas | `app/comun/cooperativas/nova/page.tsx` | `d2f7426a23c4181d7643f9bef122dad05253203c1fb6496fd8c94482957fac41` |
| cooperativas | `app/comun/cooperativas/page.tsx` | `e5047a1b4d7b7bc63b8e7c0415cf3c42f94f5c34eb12a75500cefbc07bd1ddd7` |
| criar-conta | `app/comun/criar-conta/page.tsx` | `9482d6bcb8be44ad6d99e1a99db186ab0092c82855820e6d88ba237de28b1043` |
| denuncias | `app/comun/denuncias/mapa/page.tsx` | `986efc25209609b31a646098255072d2b4c308753b170ae67ccc5c970dabf305` |
| denuncias | `app/comun/denuncias/page.tsx` | `fecb4721ab59e4a159930d4d6b9f749c80ae4177d37d989809e8263c19cbadc2` |
| denuncias | `app/comun/denuncias/problemas/[publicId]/page.tsx` | `4979f64a1ec4631715ba86c63c10e75c41ac6c121510c7e6fae75a668266e8ad` |
| dossies | `app/comun/dossies/[slug]/page.tsx` | `40ce90bc27040794e7e0507144cc903a410f0473948e644fb729154518f39f60` |
| dossies | `app/comun/dossies/page.tsx` | `8b0023b57b98155be8048d219731521f1fae98466bf390baa0b33c8d5ec17c4e` |
| entidades | `app/comun/entidades/page.tsx` | `032b535b9704354dfbaa5e410e136c37560802287bd858ff30cfd1fa88590420` |
| entrar | `app/comun/entrar/page.tsx` | `79e860ff0ec6cb026060394ce446396e5e5c3f2a5ab9efb1289129c8c0afc13b` |
| escola | `app/comun/escola/materiais/page.tsx` | `dfba50f50f7576552f649b8d28981529bac0b0c80daeaef68ccc3c0130a30c3b` |
| escola | `app/comun/escola/missao/[slug]/page.tsx` | `86d76ce48620d04319097d2dd31bea2c510757345c0eed182b5213e9958f3e2d` |
| escola | `app/comun/escola/page.tsx` | `0a88e8bf624d33017235fa049d7dc430a799098ec3dae35e5d088a1859de24d8` |
| escola | `app/comun/escola/pratica/page.tsx` | `b4a619196a67e5d2d7f8d7a4330e3210229ff89bc9d763bb59b0190e5339eb60` |
| escola | `app/comun/escola/progresso/page.tsx` | `0d2a83cc39941a7ac0e236f09d1fe6ffdf3e388424f3ddd1aedf1cdc32577b3e` |
| escola | `app/comun/escola/trilhas/page.tsx` | `4c7ea213663e7cfa07c9e32ca3dadd388b74b99dd19d150da81e4858e41d2e9a` |
| explorar | `app/comun/explorar/page.tsx` | `76cc0aff53d6a74c9a5cbdb5468c13d1c3cf2d72d8299133c52dee6c540117a1` |
| mapa | `app/comun/mapa/[slug]/page.tsx` | `6376a920d8e48611dc8a41e16c8eecd8c189ba0c2bc6d28b6a0ec93ff15e56d1` |
| mapa | `app/comun/mapa/contribuir/confirmacao/page.tsx` | `e7553c7c0a60876209697d6a361d8393727b6c2746843a7b5b04fcdc15bfb25e` |
| mapa | `app/comun/mapa/contribuir/page.tsx` | `4a686b27fe10de862d1dbeeeffc6352482767dba779aeb6c9f00f216aa61f964` |
| mapa | `app/comun/mapa/page.tsx` | `164ec90959ce9a93ccdfda2880e9728f3a1e1e962224bae53e3a265fbd9accbf` |
| minha-participacao | `app/comun/minha-participacao/page.tsx` | `6dc81291bab1bd6642a3307936ece1183aaee6d73d00e85647a96e53138bb067` |
| observatorios | `app/comun/observatorios/[slug]/acoes/page.tsx` | `729a8d4eb7cadb80eab9879c46726306700efa6c98885b1d96f5231e226ee522` |
| observatorios | `app/comun/observatorios/[slug]/campanhas/[campaignSlug]/page.tsx` | `e62ef0d29697462610dd53110874c57bf01a2183b7f102d7a7da680fb9900c07` |
| observatorios | `app/comun/observatorios/[slug]/campo/[campaignSlug]/page.tsx` | `a8a62132a8dbd37d8883d58f10f409467aa5fcf0e151e0659fd02913f7458f17` |
| observatorios | `app/comun/observatorios/[slug]/dados/page.tsx` | `a9743d7ba5e847ed0f9bef1cedc741a6eb15bef9a02f68c7bbdc161f9d68100d` |
| observatorios | `app/comun/observatorios/[slug]/mapa/page.tsx` | `f5ae7e294b4dd8926b784654b5b4e0bea54c28974e7c1fcb043ecf58750c652f` |
| observatorios | `app/comun/observatorios/[slug]/page.tsx` | `e739551a95a223c13fab7d2cd92c16ded43c8bf0fa9b916b2a873e0469992a68` |
| observatorios | `app/comun/observatorios/[slug]/registrar/page.tsx` | `8aac64d7b5a9db9c02a07d12837a76255f76f73719c861da4b074f1148e9eef2` |
| observatorios | `app/comun/observatorios/ambiente/page.tsx` | `996d311c8afb668a67e7ad3c59e99d7adf760f8306a62b223f4ae3c9da583838` |
| observatorios | `app/comun/observatorios/ambiente/qualidade-dos-rios/fontes/page.tsx` | `4ef19c6bfc28447dc219418939c00e9ab9734353d4ac922d8067d8b38682ae3c` |
| observatorios | `app/comun/observatorios/ambiente/qualidade-dos-rios/page.tsx` | `7a133d84b118eeb71bc5d4198098fd52baeca7ab1af19abb8bf9e7f71b95af55` |
| observatorios | `app/comun/observatorios/calcadas/page.tsx` | `299bb13d5c0e40e2202b08f02575381e1472e25db3e27cfdd2a53bd47e9cf5cd` |
| observatorios | `app/comun/observatorios/page.tsx` | `30a0a835e94a28eb972f84d2b147f2929163a0e710a8b3948cd884ef58774aa1` |
| observatorios | `app/comun/observatorios/panorama/page.tsx` | `120f04c3bea58527931807dc7e07171508ec64ed6209a5bd357d3c94139c53f4` |
| observatorios | `app/comun/observatorios/servicos-essenciais/energia/fontes/page.tsx` | `f7943ae7fe76eecf26781ff94e901b224e4a707137d5021d8b2690b4ea796b15` |
| observatorios | `app/comun/observatorios/servicos-essenciais/energia/page.tsx` | `7908b33480801af63d13a9404d6436184014ecdc6a70135e391c08911228aa85` |
| observatorios | `app/comun/observatorios/servicos-essenciais/page.tsx` | `b0e52298350808b8165dadee4dea3fcb978300fee2c938f05083b976f000629d` |
| observatorios | `app/comun/observatorios/territorio/fontes/page.tsx` | `e20f939ce69ed0c8efdf0752001b4cb3bfaf6f366c80af453405c7a7b58dcc3e` |
| observatorios | `app/comun/observatorios/territorio/page.tsx` | `eaca1bc7c41b83946f387bcb3557f1a1716f0bfdb13ed19771a390614171c5df` |
| observatorios | `app/comun/observatorios/transporte/fontes/page.tsx` | `728bf50242930467256fe1ef82134a3d893e60ef52ca2da24532ee44de555c51` |
| observatorios | `app/comun/observatorios/transporte/linhas/[lineCode]/page.tsx` | `b95aed86ee3bcf647f6b2cde5d32521c78e2350af4ca5b7452ddc408f91297e4` |
| observatorios | `app/comun/observatorios/transporte/page.tsx` | `86515026626e02038759fc1598b7235e5cdb993c69829f965558bb85bfd77efe` |
| offline | `app/comun/offline/page.tsx` | `49df3fc00372cff3b046668e9f12f96c80a49396195367a9727fab535ab8117d` |
| onboarding | `app/comun/onboarding/page.tsx` | `0a892fc69ed4c250513b75f41903761228bff94f2c11734d1e5df8fb5e716c64` |
| onibus | `app/comun/onibus/page.tsx` | `0eb98655865cc435b673bded7bb5a52005e33cf1fa6f46be2247d6b2cc384446` |
| participar | `app/comun/participar/confirmacao/page.tsx` | `2d1d3e0da1cdedfeaaf9a4449bca3f800dd46b41c7034beab56c07f9ca08e9a6` |
| participar | `app/comun/participar/page.tsx` | `ea711e9930ac2db01c3820ae5ca5a8db6d299e27f487b798dea006ae033e7df2` |
| pautas | `app/comun/pautas/[slug]/memoria/[memorySlug]/page.tsx` | `bb8c937f0ee94a3aebbf2e95f3da7d3b9a8228ecf9a914a26c4d27a45dd8700d` |
| pautas | `app/comun/pautas/[slug]/page.tsx` | `77f6a827aa8fb3dc67c9f47c6e24bd3098543c221d75d7c31c50fc44573b33ab` |
| pautas | `app/comun/pautas/[slug]/registros/[recordSlug]/page.tsx` | `9aef8b39ecec033e5de5ccd8d04ef28a6a1b55db5d71d0ff308a9305ce15e031` |
| pautas | `app/comun/pautas/[slug]/rodas/[circleId]/page.tsx` | `24228590887054bde0b94a811b40add2c119adeea9bfd5052c301716408f017d` |
| pautas | `app/comun/pautas/nova/page.tsx` | `ee964cfd92aa6f473ab89189d5558797aa20164b86cf42c03ccafc6c3972d039` |
| pautas | `app/comun/pautas/page.tsx` | `69ef2ca7265331f788c7c6515593c0d0946b2005453d4d678f927d10ecd4fa34` |
| preview | `app/comun/preview/esteira-politica/page.tsx` | `8b30a5b8da1b58331893dde0298a019daa3c99645b6473b873dbe0cd23a9f4d1` |
| projetos | `app/comun/projetos/[slug]/page.tsx` | `baedad2cf204ba9a11b2017934140daf0a04a0465b9c36af3d8b156bcfa36a6b` |
| projetos | `app/comun/projetos/page.tsx` | `15e41d3bdd98280341eb4bb7ef084d9d13157d96c14e7786a0a988637c98fd0b` |
| protocolo-popular | `app/comun/protocolo-popular/page.tsx` | `8e998de2c2ea700fc14b0f1ef942fa5f970febe4752489ef44f84a68d7ecdf90` |
| radio | `app/comun/radio/contribuir/page.tsx` | `d261b3946e65a9b59532be4bb0e4dd45203c94eff561d923040bbadfa30f287b` |
| radio | `app/comun/radio/direitos-e-consentimento/page.tsx` | `ef298d8ce78598d371c82b351e1bfefbc02cb48485157e85d9e2705baaeda95e` |
| radio | `app/comun/radio/episodios/[slug]/page.tsx` | `696569e277c8f9ae6abb42ef977cb93e491e72ee6329216e7295debf4a19355d` |
| radio | `app/comun/radio/grade/page.tsx` | `811ceccb78c7b3e7500fd0776e5aa93c06bf7101d6da0838bd1fb11fc283c018` |
| radio | `app/comun/radio/page.tsx` | `837cf6229fa7d62087671ea9a67b4ef7c2f4820954b491b6d616f2c447d5d0cc` |
| radio | `app/comun/radio/programas/[slug]/page.tsx` | `81f9adbf9d9de9a77aebafc72ff2a94b08e701b1e615c0510bff5674276ea658` |
| reciclagem | `app/comun/reciclagem/page.tsx` | `346bd20cbc9a170b49049879a86b08a25986fe6c7bd6147bcb4263d0bd0cf13b` |
| recuperar-acesso | `app/comun/recuperar-acesso/page.tsx` | `341ba7dd86b9b03b226b76dbc7354cb88ecec38d07a51740539a218dca7c5402` |
| redefinir-acesso | `app/comun/redefinir-acesso/page.tsx` | `482562003c15ab89f5b6f99a934620da89ee04bc89fc97db99894e31ef59ebbf` |
| relata | `app/comun/relata/mapa/page.tsx` | `abf6a97a73d3a8b05724d579202daf150832c0841394f22ac344bb298e5035d0` |
| relata | `app/comun/relata/page.tsx` | `5955c519e455b53f76138b7d719595503ada8d4c25f7208c49a55e216febcb76` |
| relatar | `app/comun/relatar/confirmacao/page.tsx` | `8ed31e6ae43825d391600dc688b23fe4a2a033e294d72e959a0f70c799ac5ba8` |
| relatar | `app/comun/relatar/page.tsx` | `97fd29f87f3781840cb9c95e1c9262b81166509a98edb2e588e2f60b0041c25f` |
| resultados | `app/comun/resultados/page.tsx` | `5d0e582fe2d1d5f621517955c47b894e8e6039a3ecfe99e095509a6495b82e3f` |
| seguranca | `app/comun/seguranca/page.tsx` | `74bc08632c87d4074c926e0b7a90789e20141fe0cd4de3d968fad743cf27ee71` |
| territorio-tomado | `app/comun/territorio-tomado/page.tsx` | `72319bd70ba860b0d8d78745e0eda593ea58b623208be85d49b2ecf480c2751a` |
| territorios | `app/comun/territorios/[slug]/page.tsx` | `e3102ac1aa0001323fa1129051583b1262de386328b394445553f0ae188f2185` |
| territorios | `app/comun/territorios/page.tsx` | `2bd2fd70ba3e6788d87f5d5a195c703cec52d13cd2722797e257cd4b371c758e` |
| transporte | `app/comun/transporte/page.tsx` | `91f11160a04f42f9e081d70a64f27891ed15740fc5f600ca4e2eb38258429b21` |

## Checkpoint e próxima entrega

U0.1-A concluído: enumeração integral das páginas COMUN e classificação por família. U0.1 total permanece em andamento: faltam endpoints, ações de escrita, flags, fontes canônicas, testes e rastreio das jornadas.

**Item ativo seguinte: U0.1-B — cruzar cada família com gates, ações e fontes de dados, começando pelo ciclo de organização de base e preservando a cobertura de todas as famílias.**

Nenhum novo módulo, migration, dependência ou configuração remota foi criado. Não houve execução de testes de aplicação: alteração documental, sem código de runtime.


## U0.1-B — primeiro cruzamento de ações e dependências

Foi produzido `comun-u0-action-index.json`, inventário estático de arquivos cujo nome termina em `actions.ts` sob `app/comun`. Inclui exports async, imports, menções a guards, tabelas e RPCs literais. Não inclui automaticamente handlers em `route.ts`, funções com outros nomes, chamadas dinâmicas ou dependências transitivas. Menção a um guard não prova autorização correta. O índice é mapa para auditoria, não scanner de segurança certificado.

### Achados de leitura direta — organização de base e Feirinha

| ID | Evidência | Consequência para o produto | Encaminhamento |
|---|---|---|---|
| U0-F07 | `publishPautaDecision` em `app/comun/admin/pautas/[id]/political-cycle-actions.ts` recusa publicação pelo autor e exige admin/editor | A publicação de decisão não funciona com uma única pessoa autorizada. Isso pode ser requisito deliberado de governança, não bug | Preservar revisão coletiva; verificar percurso de rascunho/plano individual e informar bloqueio antes de prometer publicação |
| U0-F08 | `updateCollectiveActionParticipation` exige liberar tarefas ativas antes de registrar saída | Protege continuidade, mas acrescenta barreira a uma saída voluntária | Avaliar saída que libere compromissos com confirmação explícita; ainda sem alteração ou decisão de implementação |
| U0-F09 | `connection-actions.ts` implementa interesse, contato protegido consentido, aceite/recusa e retirada | Feirinha tem preparação funcional além do catálogo; diagnóstico anterior de descoberta era parcial | Rastrear adapter, RPCs, formulários, acompanhamento e flags antes de chamar esse percurso de lacuna ou entrega pronta |
| U0-F10 | `createLowFrictionPautaAction` valida questão de 12–500 caracteres, segurança, sessão, duplicata e evidência antes de RPC | Criação enxuta existe no código; seu salvamento e retorno precisam ser verificados no cliente | Conferir login/retomada, rejeição, duplicata e origem da evidência; não presumir texto persistido pela mensagem da interface |
| U0-F11 | Participar/assumir tarefa usa sessão e release; decisão de pauta usa papel global admin/editor | Caminhos pessoais e editoriais têm autoridades diferentes | Mapear delegação por comunidade e governança antes de afirmar autonomia distribuída |

A existência de chamadas via cliente privilegiado nestes arquivos não é, isoladamente, finding de vulnerabilidade. Exige verificar autorização completa, escopo de cada operação e enforcement na camada de dados em auditoria específica.

### Princípio de produto para uso solo

Uma pessoa deve conseguir preparar objetivo, plano, tarefas e rascunhos sem simular uma comunidade. Decisão coletiva publicada e revisão independente continuam distintas de decisão do organizador. Não cadastrar segunda identidade fictícia nem usar IA para simular uma segunda aprovação humana. Se o produto não permitir preparação útil dentro dessas regras, isso é lacuna de jornada a resolver explicitamente.

### Estado e próximo item

U0.1-B parcial: índice de ações e leitura focal de quatro arquivos; sem execução de operações, inspeção remota ou certificação funcional. Próximo item único: **U0.1-C — verificar o percurso solo de preparação de pauta/plano e o retorno após autenticação; cruzar os componentes com as ações já existentes.** A cobertura das demais famílias permanece na fila U0, sem ser declarada concluída.


## U0.1-C — percurso de pauta e preparação individual

Leitura direta: `app/comun/pautas/nova/page.tsx`, `pauta-creation-form.tsx`, `actions.ts`, `lib/community-return.ts`, callback de autenticação (referências), `components/comun-pauta-creation-draft-clear.tsx`, `components/comun-pautas-vivas.tsx`, `app/comun/admin/pautas/page.tsx`, trechos de `app/actions.ts` e teste de coerência. SQL versionado foi usado somente para entender a intenção histórica de criação pública; não demonstra schema remoto atual.

| ID | Achado | Grau de certeza e impacto |
|---|---|---|
| U0-F12 | `sessionStorage` recebe o texto antes do login e ao reescrever; `onChange` altera apenas estado React | Confirmado no componente: edição não tem salvamento contínuo. Recarregar antes de um desses pontos pode perder o texto ou restaurar versão anterior |
| U0-F13 | Acesso a `sessionStorage` é direto, sem captura de exceção, inclusive antes de redirecionar ao login | Confirmado no código; falha de storage pode interromper esse caminho. Não reproduzida em navegador nesta rodada |
| U0-F14 | Uma única chave por aba guarda apenas a questão, sem contexto da evidência nem escolha de mantê-la | Confirmado no componente; escopo por aba e ausência de sincronização entre dispositivos são limites de sessionStorage. Risco de texto/contexto divergentes deve ser testado |
| U0-F15 | O teste existente escreve, abre login e usa `goBack`; não conclui autenticação | Cobertura parcial confirmada; não chamar de prova de login completo/retomada |
| U0-F16 | A criação simplificada avisa que a pauta será pública. A administração permite `internal`, mas a primeira opção e o fallback da ação são `public` | Dois caminhos reais no código. Preparação privada existe para administrador, porém não é a entrada padrão. Não é prova de vazamento; pede decisão explícita de UX |
| U0-F17 | Tarefas administrativas já aceitam descrição, prazo, responsável, habilidade, prioridade e visibilidade em `app/actions.ts` | Evitar construir um gerenciador paralelo. Falta conferir campos renderizados, acesso e ciclo funcional antes de certificar planejamento solo |
| U0-F18 | Limpeza da chave ocorre no efeito da tela com feedback `pauta=criada` | A limpeza depende de feedback de URL, não de recibo local ligado à tentativa; risco de apagar texto de outra preparação na mesma aba precisa ser reproduzido |

### Decisão de experiência recomendada

Preservar a entrada pública simples para quem quer propor uma questão. Dar ao organizador um caminho claro de preparação interna, com indicação persistente de visibilidade. Não converter silenciosamente propostas públicas em privadas nem alterar defaults globais antes de revisar efeitos. Reutilizar pauta, tarefas e rascunhos já existentes. Uma decisão preparada individualmente não deve aparecer como deliberação coletiva aprovada.

### Primeiro pacote de correção proposto: continuidade do texto

Escopo mínimo: captura de falhas de storage com mensagem honesta; continuidade de edição enquanto a aba existir; restauração sem sobrescrever edição recente; forma explícita de descartar; limpeza vinculada à criação correspondente; preservação do contexto/consentimento da evidência. Não enviar rascunho ao servidor nem mudar para armazenamento persistente de longa duração sem decisão de privacidade.

Critérios de aceitação: recarregar após editar; voltar de login; storage indisponível; evidência alterada; criação bem-sucedida; chegada a feedback antigo com outro rascunho; descarte explícito. Autenticação concluída deve ter prova própria ou permanecer NOT_RUN. Usar testes existentes e acrescentar somente cenários de risco real. Este pacote ainda não foi implementado.

### Checkpoint

U0.1-C: rastreio estático concluído no recorte descrito; ensaio de navegador NOT_RUN. Foram identificados mecanismos existentes para preparação interna e tarefas, evitando diagnóstico falso de ausência total. Próximo item único: **U0.1-D — verificar ambiente e testes disponíveis para preparar a correção focal de continuidade do rascunho, antes de alterar runtime.** O inventário das outras famílias continua pendente em U0; esta priorização não declara auditoria integral concluída.


## U0.1-D — primeira correção focal implementada localmente

O formulário passa a salvar a questão em sessionStorage a cada edição, remove o texto apagado e protege acesso/leitura/escrita contra exceções. Restauração adiada não sobrescreve texto que a pessoa já começou a editar. Falha antes de login/recarregamento mantém a pessoa no formulário e oferece orientação para copiar; ida ao login sem restauração é escolha explícita. A mensagem explica escopo por aba e ausência de rascunho na conta.

Validação: 11 testes focais PASS (continuidade e regras existentes de criação); ESLint focal PASS; TypeScript completo PASS. Build de produção PASS, incluindo compilação, TypeScript e geração de páginas. Leitura da documentação Next instalada e boas práticas React realizada. Nenhuma dependência/lockfile alterada.

Limites: não modifica cleanup por URL, modelo de evidência, autenticação ou privacidade de pauta. A correção é uma primeira fatia, não fechamento de todo o pacote proposto. Testes de browser/recarregar/login completo e inspeção visual ainda NOT_RUN. Não houve push, merge ou deploy.

Próximo item único: **U0.1-E — prova de navegador da continuidade de edição, storage recusado e retorno ao formulário; depois tratar limpeza de rascunho/contexto com recibo próprio se confirmado.** U0 continua ativo; novas funcionalidades permanecem fora desta passada.


## U0.1-E — testes renderizados preparados; execução bloqueada pelo ambiente

Browser plugin não disponível; aplicado fluxo Playwright da habilidade frontend-testing-debugging. A suíte existente agora inclui recarregar/restaurar última edição, revisão, apagamento e storage negado sem perda imediata do texto ou navegação automática. Descoberta de 21 casos (três testes em sete viewports) PASS; isso NÃO é execução dos casos. ESLint focal e diff check PASS.

`next start` informou Ready em 127.0.0.1:3000, mas consulta HTTP de processo separado recusou conexão (curl 7 / HTTP 000). Não usar esse início como prova de página servida. Instalação Chromium esgotou suas tentativas internas: arquivo vazio/truncado, erro de diretório central ZIP; exit 1. Sem repetição manual da instalação. Nenhuma prova visual, console, overflow ou interação foi produzida. Login concluído segue NOT_RUN.

Estado da correção: candidata local, 11 unitários/lint/TypeScript/build previamente aprovados, navegador BLOCKED_ENVIRONMENT. Sem push, integração, deploy ou autorização presumida.

Próximo item elegível enquanto o navegador estiver bloqueado: **U0.1-F — rastrear o restante da preparação interna de pauta e tarefas, com foco em visibilidade explícita, campos necessários e ausência de duplicação.** A retomada de U0.1-E exige Chromium disponível e servidor acessível no mesmo ambiente; não exige pedir testadores ao usuário.


## U0.1-F — preparação interna e correção de fronteira pública

Leitura do formulário confirmou que a criação de tarefa não oferece `due_at`; edição preserva prazo em hidden. Responsável e visibilidade também eram hidden na edição. A melhoria local torna estes dois últimos editáveis, acrescenta nomes acessíveis a título/descrição/situação/prioridade e explica que responsável de referência não equivale a aceite da pessoa. Defaults de publicação não foram alterados.

**U0-F19 — prioridade de privacidade:** `listPublicPautaTasks` usa cliente service e filtrava pauta/status, mas não `visibility`. A página pública chama essa função. Isso configura risco demonstrável no caminho de código; não foi consultada produção nem comprovado incidente ou presença de registros internos expostos. Foi acrescentado filtro explícito `visibility=public` antes de limitar resultados. Sem migration ou alteração de grants.

Prova focal: dois testes PASS com cliente supabase-js real e transporte HTTP simulado; registros internos, arquivados e de outra pauta não chegam ao retorno, e o filtro consta na requisição PostgREST com paginação. Não equivale a teste de RLS ou banco real. ESLint focal, TypeScript completo e build de produção PASS. Documentação oficial de eq/RLS consultada; changelog markdown não abriu na ferramenta de consulta. APIs existentes preservadas.

Prazo editável continua pendente, com definição explícita de fuso antes de implementação. Testes renderizados continuam bloqueados pelo Chromium indisponível. Próximo item: **U0.1-G — revisar outras projeções públicas de tarefas e suas fontes/contagens no mesmo contexto antes de ampliar o planejamento.** A correção local não certifica ausência de exposição em todo o projeto nem produção corrigida.


## U0.1-G — contagens públicas de tarefas

U0-F20 confirmado no código: `withPautaStats` usava `listAdminPautaTasks` também para as páginas públicas. A correção local estabelece escopo público por padrão, com tarefas públicas, e explicita escopo administrativo nas duas entradas admin. Não muda a contagem operacional de tarefas internas na administração.

Três testes focais PASS, incluindo consulta via cliente real com transporte simulado que verifica uma tarefa pública versus duas tarefas administrativas (uma interna). ESLint focal, TypeScript completo e diff check PASS. Não houve teste de banco real ou nova inspeção de produção. Sem alteração visual nesta passada; build anterior não é apresentado como novo build deste commit.

Outras leituras: `getPersonalCenter` e `getPublicAction` já filtram tarefas por visibility public. `listCommunityWorkGroups` busca tarefas em relação aninhada sem filtro; consumidor deve ser rastreado antes de afirmar exposição. `learningSnapshot` obtém tarefas por vínculo de pauta sem filtro de visibilidade; a autorização desejada nesse contexto precisa ser definida/verificada. Endpoints administrativos/calendário não devem receber filtro público por automatismo.

Próximo item único: **U0.1-H — concluir rastreio de relações de grupo e seleção de tarefas da Escola, preservando fronteiras por contexto.** Auditoria continua parcial; a correção não representa certificação global de privacidade. Chromium permanece bloqueado, sem novas tentativas de instalação.


## U0.1-H — grupos e seleção de prática

`listCommunityWorkGroups` tem como consumidor encontrado a página de comunidade, que projeta somente nome, estado, ciclo, objetivo, resultado e próximo passo. Tarefas aninhadas não são renderizadas por esse consumidor; portanto, não se confirmou exposição visual de tarefas por essa página. Foi removida a busca aninhada desnecessária, reduzindo leitura privilegiada.

`learningSnapshot` é retornado na API autenticada da Escola, por sessão ativa, e selecionava tarefas das pautas com vínculo sem filtrar visibility. Acrescentado filtro `public`. Isso não cria direito de leitura de tarefas internas por associação simples. Progresso/reflexões pessoais permanecem privados e seguem seu caminho próprio.

Validação: 11 testes PASS entre fronteira da API da Escola, privacidade de tarefas e novas consultas de seleção/grupos com supabase-js real e transporte simulado; ESLint focal, TypeScript completo e diff check PASS. Nenhuma consulta de produção ou migration executada. Não foi repetido build nesta passada; não há validação renderizada nova.

**U0-F21 — escrita de prática pendente:** a migration pinada `20261006134804_comun_learning_r0.sql` verifica membership ativo, pauta não arquivada e tarefa pertencente à pauta/não arquivada, sem verificar visibility da tarefa. O POST atual encaminha IDs à função service-only. A filtragem de leitura não impede submissão manual de outro ID conhecido. Não foi comprovada leitura de conteúdo privado por esse POST, mas falta coerência de autorização da referência. Migration/manifest não foram modificados; Escola continua pendente e não deve ser declarada liberada.

Próximo item único: **U0.1-I — proteger a seleção de referência na submissão de prática, com testes negativos e sem modificar os bytes pinados da migration.** Registrar separadamente a necessidade de verificar atomicidade/regra na futura liberação do banco. Coerência das relações de pauta/grupo (além de tarefas) continua em backlog U0.


## U0.1-I — proteção de referências na submissão de prática

O POST de prática consulta as opções autorizadas no servidor com a identidade da sessão antes de chamar a RPC. Recusa pauta fora das opções ou tarefa ausente/ligada a outra pauta; aceita prática sem tarefa quando a pauta está disponível. Falha de verificação interrompe a escrita sem expor mensagem técnica.

Validação: 17 testes focais PASS (API, seleção da Escola e tarefas públicas), incluindo envio manual de IDs, identidade injetada ignorada, referência válida, tarefa opcional e falha de verificação sem RPC; ESLint e TypeScript completo PASS. Build de produção PASS. Sem consulta/escrita Production, migration ou alteração de flag.

Limite importante: verificação na aplicação e escrita são operações separadas. Não há garantia atômica contra mudança de visibilidade entre elas. A migration pinada permanece inalterada; a futura liberação da Escola precisa resolver a política de referências no banco com revisão própria. Esta correção não habilita a Escola nem certifica o schema.

**Próximo item único: U0.2 — revisar e consolidar o pacote local já produzido, conferir divergência da base remota e preparar candidato revisável antes de abrir novas implementações.** Auditoria das famílias restantes fica preservada no inventário U0. Browser E2E continua BLOCKED_ENVIRONMENT. Não aumentar indefinidamente o conjunto de mudanças locais.


## U0.2 — revisão integrada do pacote

Base remota atualizada e confirmada em `3694710f3b3b1d26031c7c87c52826798a88dbea`; não houve divergência a reconciliar nesta consulta. Branch candidata `codex/comun-product-audit-20261014`.

A revisão corrigiu também a limpeza de rascunho: cada gravação local cria revisão aleatória, a ação só devolve recibo UUID válido após criação bem-sucedida e o cliente limpa somente se o recibo corresponder à revisão ainda guardada. Abrir link antigo ou sem recibo não apaga uma preparação mais recente. A limpeza trata storage recusado sem lançar exceção. O recibo não autoriza publicação, não identifica pessoa e não contém texto; é somente controle de continuidade. O compartilhamento público existente continua removendo parâmetros.

Resultado integrado: **1.486 testes unitários / 255 arquivos PASS; lint completo PASS; TypeScript completo PASS; seis contratos Node de coerência e superfícies PASS**. A primeira suíte ampla falhou em uma expectativa estática antiga de chamada direta a sessionStorage; a expectativa foi atualizada para o helper protegido, mantendo prova funcional de storage negado e revisões. Build final de produção PASS.

E2E: 21 casos descobertos, zero executado neste ambiente. Chromium não instalou (ZIP truncado) e o servidor de processo separado não foi acessível. Sem retry manual de instalação, sem browser simulado apresentado como real. Autenticação concluída, compreensão humana e aparelhos reais permanecem NOT_RUN.

Sem alteração de migrations, manifestos, dependências, lockfile, flags, indexação ou configuração remota. Não há certificação de banco, mitigação já implantada nem V1 concluída. Proteção da referência de prática na aplicação não é atomicidade no banco. Conteúdo de observatório/Feirinha e restante das 46 famílias continuam no inventário, não foram declarados funcionalmente auditados.

Próxima sequência única: publicar candidato draft com essas evidências → inspecionar checks do SHA → tratar falhas aplicáveis sem dispensar gates → obter prova de navegador em ambiente disponível → seguir auditoria U0 do ciclo de organização/Feirinha. Não iniciar novos módulos enquanto o pacote aguarda fechamento.


## U0.2 — publicação e retorno do CI

PR draft **#546**, primeiro head `685de5ca4b33c2b8ca52a1128bb87a4e0ea10c88`, árvore `69676fb3576d5cb74e3c42c8aeb9e175ffa3e5e8` idêntica ao candidato local. Git HTTPS sem credencial; publicação realizada pela conexão GitHub existente, sem solicitar/expor chave. Branch remota não foi integrada.

Primeira leitura remota identificou: A7 aprovado; verificações A1/C1/D1/E2/E3 falharam antes da captura por falta de `/home/runner/.postgresql/root.crt`; não é evidência de drift de schema. Launch Readiness e Experience Coherence falharam por Prettier nos arquivos alterados. COST-02 recusou ausência de marcador `[comun-preview]`. Falhas originais preservadas, sem reclassificação como PASS.

Ajuste focal dos cinco preflights: CA pública já pinada no repositório, `PGSSLMODE=verify-full` e default read-only somente nos passos de consulta/plano. SQL, predicados, grants, classificação de migrations e recusa de pendências permanecem intactos. Sem inclusão de segredo ou ambiente global de CA. Testes locais confirmam 10 passos protegidos e dry-run mantido. O escopo final inclui estes cinco workflows; a descrição anterior de nenhum workflow alterado refere-se ao primeiro candidato.

Formatação corrigida com Prettier 3.9.10 sem modificar dependências/lockfile. Próximo commit usa o marcador existente de Preview; isso solicita um build verificável do SHA, não substitui a prova exigida pelo gate. Resultado do próximo head deve ser consultado novamente.

Validação adicional: 34 contratos Node de CA/planner/checkpoint PASS. Nova suíte após formatação PASS: 1.486 testes em 255 arquivos. Sem novo runtime desde a compilação aprovada; alterações seguintes são formatação, transporte de leitura e evidência. E2E e atomicidade SQL continuam pendentes.
