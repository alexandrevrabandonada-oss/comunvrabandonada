import type {
  SensitiveDisclosureInput,
  SensitiveForwardingCategory,
} from "./comun-sensitive-forwarding-feature";

const CATEGORY_LABELS: Record<SensitiveForwardingCategory, string> = {
  public_health: "Saúde pública",
  public_education: "Educação pública",
  child_protection: "Proteção de criança ou adolescente",
};

export type SensitiveDisclosurePreview = {
  categoryLabel: string;
  channelOnly: boolean;
  sharedItems: string[];
  notSharedItems: string[];
  institutionalText: string | null;
};

export function buildSensitiveDisclosurePreview(
  category: SensitiveForwardingCategory,
  issueLabel: string | null,
  input: SensitiveDisclosureInput,
): SensitiveDisclosurePreview {
  const notSharedItems = [
    "relato original",
    "protocolo COMUN",
    "foto",
    "localização",
    "Carteira",
    "identidade da conta",
    "tokens e recibo",
    "dados não selecionados",
  ];
  if (category === "child_protection") {
    return {
      categoryLabel: CATEGORY_LABELS[category],
      channelOnly: true,
      sharedItems: ["nenhum conteúdo da situação pelo COMUN"],
      notSharedItems,
      institutionalText: null,
    };
  }
  const sharedItems = [`categoria geral: ${CATEGORY_LABELS[category]}`];
  let institutionalText = `Quero registrar uma manifestação sobre ${CATEGORY_LABELS[category]}.`;
  if (input.includeIssueType && issueLabel) {
    sharedItems.push(`tipo do problema: ${issueLabel}`);
    institutionalText += `\nTipo do problema: ${issueLabel}`;
  }
  if (input.includeUnitLabel) {
    const value = input.unitLabel.trim();
    sharedItems.push(`unidade: ${value}`);
    institutionalText += `\nUnidade informada para este encaminhamento: ${value}`;
  }
  if (input.includeNetworkLabel) {
    const value = input.networkLabel.trim();
    sharedItems.push(`rede: ${value}`);
    institutionalText += `\nRede informada para este encaminhamento: ${value}`;
  }
  if (input.includeApproximatePeriod) {
    const value = input.approximatePeriod.trim();
    sharedItems.push(`período aproximado: ${value}`);
    institutionalText += `\nPeríodo aproximado: ${value}`;
  }
  if (input.includePersonAuthoredSummary) {
    const value = input.personAuthoredSummary.trim();
    sharedItems.push("mensagem escrita especificamente para o encaminhamento");
    institutionalText += `\nMensagem escrita para este encaminhamento: ${value}`;
  }
  return {
    categoryLabel: CATEGORY_LABELS[category],
    channelOnly: false,
    sharedItems,
    notSharedItems,
    institutionalText,
  };
}
