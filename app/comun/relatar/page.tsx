import { ReportForm } from "@/app/comun/relatar/report-form";
import { QuickCaptureV2 } from "@/app/comun/relatar/quick-capture-v2";
import { isComunQuickCaptureEnabled } from "@/lib/comun-capture-feature";
import { isComunRelataEvidenceEnabled } from "@/lib/comun-relata-evidence-feature";

type TopicChoice = "trabalho" | "escolas" | "saude" | "meio-ambiente" | "cidade" | "outro";

const allowedTopics = new Set(["trabalho", "escolas", "saude", "meio-ambiente", "cidade", "outro"]);
const allowedCampaignCategories = new Set([
  "pressao-psicologica",
  "assedio-moral",
  "burnout",
  "atraso-salarial",
  "fgts-atrasado",
  "terceirizacao",
  "jornada-abusiva",
  "ferias-impostas",
  "risco-de-acidente",
  "insalubridade-periculosidade",
  "medo-de-denunciar",
  "retaliacao",
]);

export default async function ReportPage(
  props: {
    searchParams: Promise<{ comunidade?: string; pauta?: string; categoria?: string; modo?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  if (isComunQuickCaptureEnabled() && searchParams.modo !== "detalhado") {
    return <QuickCaptureV2 evidenceEnabled={isComunRelataEvidenceEnabled()} />;
  }
  const initialTopicChoice: TopicChoice =
    searchParams.comunidade && allowedTopics.has(searchParams.comunidade)
      ? (searchParams.comunidade as TopicChoice)
      : "trabalho";

  const initialIssueSlug =
    searchParams.pauta === "trabalho-burnout-volta-redonda" ||
    searchParams.pauta === "falta-profissionais-escolas" ||
    searchParams.pauta === "fila-cirurgias-exames" ||
    searchParams.pauta === "po-preto-fumaca-cheiro-forte" ||
    searchParams.pauta === "buracos-calcadas-abandono-bairros"
      ? searchParams.pauta
      : "";

  const initialCategory =
    searchParams.categoria && allowedCampaignCategories.has(searchParams.categoria) ? searchParams.categoria : "";

  return (
    <ReportForm
      initialCategory={initialCategory}
      initialIssueSlug={initialIssueSlug}
      initialTopicChoice={initialTopicChoice}
    />
  );
}
