import type { RelataCategory } from "../comun-relata-contract";
import {
  COMUN_ENVIRONMENTAL_CHANNEL_CATALOG,
  type EnvironmentalInstitutionalChannel,
} from "./comun-environmental-channel-catalog";
import {
  COMUN_URBAN_INCIDENT_CHANNEL_CATALOG,
  type UrbanIncidentInstitutionalChannel,
} from "./comun-urban-incident-channel-catalog";

export type CivicInstitutionalChannel = {
  id: string;
  institution: string;
  category: RelataCategory;
  channelType: "phone" | "web";
  destination: string;
  sourceUrl: string;
  sourceStatus: "source_verified";
  operationalStatus: "operationally_unchecked";
  identificationRequirement: string;
  protocolExpectation: string;
  notes: string;
  automationAllowed: false;
};

function asChannel(
  value: EnvironmentalInstitutionalChannel | UrbanIncidentInstitutionalChannel,
  category: RelataCategory,
): CivicInstitutionalChannel {
  return {
    id: value.id,
    institution: value.institution,
    category,
    channelType: value.channelType,
    destination: value.destination,
    sourceUrl: value.sourceUrl,
    sourceStatus: value.sourceStatus,
    operationalStatus: value.operationalStatus,
    identificationRequirement: value.identificationRequirement,
    protocolExpectation: value.protocolExpectation,
    notes: value.notes,
    automationAllowed: false,
  };
}

export function listCivicInstitutionalChannels(category: string | null) {
  const environmental = COMUN_ENVIRONMENTAL_CHANNEL_CATALOG.flatMap((channel) =>
    channel.categories.map((entry) => asChannel(channel, entry as RelataCategory)),
  );
  const urban = COMUN_URBAN_INCIDENT_CHANNEL_CATALOG.flatMap((channel) =>
    channel.categories.map((entry) => asChannel(channel, entry as RelataCategory)),
  );
  return [...environmental, ...urban].filter((channel) => channel.category === category);
}

export function findCivicInstitutionalChannel(category: string | null, id: string) {
  return listCivicInstitutionalChannels(category).find((channel) => channel.id === id) ?? null;
}

export function publicCivicInstitutionalChannel(channel: CivicInstitutionalChannel) {
  return {
    id: channel.id,
    institution: channel.institution,
    channelType: channel.channelType,
    destination: channel.destination,
    sourceUrl: channel.sourceUrl,
    sourceStatus: channel.sourceStatus,
    operationalStatus: channel.operationalStatus,
    identificationRequirement: channel.identificationRequirement,
    protocolExpectation: channel.protocolExpectation,
    notes: channel.notes,
    automationAllowed: false as const,
  };
}

