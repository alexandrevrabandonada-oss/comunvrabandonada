import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const collectionSlug = "piloto-pesquisa-fotografias-historicas-vr-01";
const pilot = [
  ["HotelSolteiros_230746.jpg", "Formação urbana e arquitetura", "Confirmar se 23/07/1946 é a data da imagem, localização e autoria."],
  ["AVENIDA DO RETIRO 1950.jpg", "Formação urbana e bairros", "Confirmar trecho da avenida, sentido da vista e data de 1950."],
  ["HotelBrasil_200754.jpg", "Formação urbana e arquitetura", "Confirmar se 20/07/1954 é a data da imagem, endereço e contexto da inauguração."],
  ["Esc_Central291056.jpg", "Educação e equipamentos públicos", "Confirmar instituição, local e se 29/10/1956 é a data da imagem."],
  ["ProvaCiclística_070956.jpg", "Esporte e vida comunitária", "Identificar prova, percurso, participantes e confirmar 07/09/1956."],
  ["SÃO LUIZ 1965.jpg", "Formação urbana e bairros", "Identificar o referente de São Luiz e confirmar local e data."],
  ["Vista Aérea 1968.jpg", "Paisagem e transformação urbana", "Identificar bairros, orientação da vista, autoria e data."],
  ["VOLDAC 1962.jpg", "Trabalho, indústria e associações", "Identificar evento ou instituição VOLDAC, pessoas e data."],
  ["CENTRO COMERCIAL DA VILA SANTA CECÍLIA.JPG", "Comércio e vida urbana", "Confirmar local, período, estabelecimentos visíveis e autoria."],
  ["CONSTR. CINE 9 DE ABRIL.jpg", "Arquitetura e cultura", "Confirmar fase da obra, data, autoria e relação com outras imagens da série."],
  ["INAUGURAÇÃO DO CINE 9 DE ABRIL.jpg", "Arquitetura e cultura", "Confirmar data da inauguração, pessoas, evento e autoria."],
  ["COLÉGIO NOSSA SENHORA DO ROSÁRIO - CONSTRUÇÃO.jpg", "Educação e equipamentos públicos", "Confirmar fase da obra, endereço, data e autoria."],
  ["Bar da cabeceira da ponte Pequetita Amorin.jpg", "Comércio e sociabilidade", "Confirmar nome do estabelecimento, ponte, bairro, pessoas e período."],
  ["Beira_Linha.jpg", "Mobilidade e ocupação urbana", "Identificar trecho ferroviário, bairro, data e contexto das moradias."],
  ["Rua São Pedro - delegacia Chapelzinho Vermelho.jpg", "Formação urbana e serviços públicos", "Confirmar logradouro, edifícios citados, bairro, data e autoria."],
  ["Rua Santo Antõnio (Niteroi).jpg", "Formação urbana e bairros", "Normalizar o nome da rua e do bairro; confirmar data e ponto de vista."],
  ["Igreja Santa Cecília 001.jpg", "Religião e arquitetura", "Identificar fase do edifício, evento, data e autoria."],
  ["Igreja Santo Antônio (antes Da reforma).jpg", "Religião e arquitetura", "Confirmar qual reforma, localização, data e autoria."],
  ["Ponte Rolante.jpg", "CSN, indústria e infraestrutura", "Identificar instalação, período, atividade retratada e autoria."],
  ["Usinacsn.jpg", "CSN, indústria e infraestrutura", "Identificar setor da usina, data, autoria e eventuais riscos de crédito."],
  ["prim_furo_46.jpg", "CSN, indústria e infraestrutura", "Confirmar interpretação de primeiro furo, acontecimento e data de 1946."],
  ["planta_geral.jpg", "Planejamento e cartografia", "Identificar documento reproduzido, órgão produtor, data, escala e direitos."],
  ["RADIO SIDERURGICA NACIONAL - FUNCIONÁRIOS.jpg", "Comunicação e trabalho", "Identificar pessoas, instalações, data, autoria e fonte da reprodução."],
  ["PRESIDENTE EURICO GASPAR DUTRA.jpg", "Política e memória pública", "Confirmar ocasião, local, demais pessoas, autoria e data."],
  ["a 2ª MAIS BELA FOTO PONTE EM FRENTE AOS CORREIOS.jpg", "Paisagem e transformação urbana", "Substituir o juízo do nome por descrição factual; identificar ponte, correios, data e autoria."],
];

console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", collection_slug: collectionSlug, selected: pilot.length }, null, 2));
if (!apply) process.exit(0);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/i.test(url || "")) throw new Error("A operação exige uma URL Supabase remota.");
if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente.");
if (process.env.COMUN_ARCHIVE_PILOT_CONFIRM !== "CREATE_PRIVATE_RESEARCH_PILOT")
  throw new Error("Defina COMUN_ARCHIVE_PILOT_CONFIRM=CREATE_PRIVATE_RESEARCH_PILOT.");

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data: collection, error: collectionError } = await db.from("comun_archive_collections").upsert({
  slug: collectionSlug,
  title: "Piloto de pesquisa — fotografias históricas de Volta Redonda 01",
  summary: "Seleção privada para identificação assistida, pesquisa documental e revisão de direitos.",
  description: "As legendas de origem são pistas, não fatos publicados. Cada imagem depende de confirmação de data, local, autoria, pessoas e direitos.",
  status: "review",
  published_at: null,
}, { onConflict: "slug" }).select("id").single();
if (collectionError) throw collectionError;

const filenames = pilot.map(([filename]) => filename);
const { data: assets, error: assetError } = await db.from("comun_archive_assets")
  .select("archive_item_id,original_filename")
  .eq("bucket_scope", "private_original")
  .in("original_filename", filenames);
if (assetError) throw assetError;
const itemByFilename = new Map((assets ?? []).map((asset) => [asset.original_filename, asset.archive_item_id]));
const missing = filenames.filter((filename) => !itemByFilename.has(filename));
if (missing.length) throw new Error(`Originais do piloto não encontrados: ${missing.join(", ")}`);

for (const [position, [filename, theme, question]] of pilot.entries()) {
  const { error } = await db.from("comun_archive_collection_items").upsert({
    collection_id: collection.id,
    archive_item_id: itemByFilename.get(filename),
    position,
    editorial_note: `Eixo provisório: ${theme}. Pergunta de pesquisa: ${question}`,
  }, { onConflict: "collection_id,archive_item_id" });
  if (error) throw error;
}

console.log(JSON.stringify({ collection_id: collection.id, linked: pilot.length, missing: 0, published: 0 }, null, 2));
