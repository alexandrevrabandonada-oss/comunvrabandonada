import type { Agency, Channel } from "./comun-relata-contract";

export const RELATA_AGENCIES: Agency[] = [
  { id: "agency-fixture-lighting", kind: "public_lighting", displayName: "Serviço de iluminação pública (abstrato)", verified: false },
  { id: "agency-fixture-power", kind: "power_distribution", displayName: "Distribuição de energia (abstrata)", verified: false },
  { id: "agency-fixture-emergency", kind: "emergency", displayName: "Emergência local (abstrata)", verified: false },
  { id: "agency-fixture-environment", kind: "environmental", displayName: "Proteção ambiental (abstrata)", verified: false },
  { id: "agency-fixture-review", kind: "community_review", displayName: "Revisão humana do COMUN", verified: false },
];

export const RELATA_CHANNELS: Channel[] = RELATA_AGENCIES.map((agency) => ({
  id: `channel-${agency.id}`,
  agencyId: agency.id,
  label: `Canal futuro · ${agency.displayName}`,
  kind: "fixture",
  verified: false,
  sourceStatus: "unverified_fixture",
}));

export function listRelataChannelsFor(kind: Agency["kind"]) {
  const agency = RELATA_AGENCIES.find((item) => item.kind === kind);
  return agency ? RELATA_CHANNELS.filter((channel) => channel.agencyId === agency.id) : [];
}
