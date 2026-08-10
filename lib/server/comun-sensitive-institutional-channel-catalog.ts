import type { SensitiveForwardingCategory } from "../comun-sensitive-forwarding-feature";
import { listComunChildProtectionChannels } from "./comun-child-protection-channel-catalog";
import { listComunEducationInstitutionalChannels } from "./comun-education-institutional-channel-catalog";
import { listComunHealthInstitutionalChannels } from "./comun-health-institutional-channel-catalog";

export type ComunSensitiveInstitutionalChannel = {
  id: string;
  institution: string;
  category: SensitiveForwardingCategory;
  channelType: "web" | "phone";
  destination: string;
  sourceUrls: string[];
  sourceStatus: "source_verified";
  operationalStatus: "operationally_unchecked";
  identificationRequirement: string;
  anonymity: string;
  protocolExpectation: string;
  notes: string;
  emergencyOnly: boolean;
  automationAllowed: false;
};

export function listComunSensitiveInstitutionalChannels(
  category: SensitiveForwardingCategory,
  immediateDanger = false,
): ComunSensitiveInstitutionalChannel[] {
  if (category === "public_health") {
    return listComunHealthInstitutionalChannels()
      .filter(
        (channel) =>
          channel.sourceStatus === "source_verified" &&
          Boolean(channel.destination) &&
          (channel.sphere !== "emergency" || immediateDanger),
      )
      .map((channel) => ({
        id: channel.id,
        institution: channel.institution,
        category,
        channelType: channel.channelType === "phone" ? "phone" : "web",
        destination: channel.channelType === "phone" ? `tel:${channel.destination}` : channel.destination!,
        sourceUrls: [channel.sourceUrl],
        sourceStatus: "source_verified" as const,
        operationalStatus: channel.operationalStatus,
        identificationRequirement: channel.identificationRequirement,
        anonymity: channel.anonymity,
        protocolExpectation: channel.protocolExpectation,
        notes: channel.notes,
        emergencyOnly: channel.sphere === "emergency",
        automationAllowed: false as const,
      }));
  }
  if (category === "public_education") {
    return listComunEducationInstitutionalChannels()
      .filter(
        (channel) =>
          channel.sourceStatus === "source_verified" &&
          !channel.protectionOnly &&
          !channel.emergencyOnly,
      )
      .map((channel) => ({
        id: channel.id,
        institution: channel.institution,
        category,
        channelType: channel.channelType === "phone" ? "phone" : "web",
        destination: channel.channelType === "phone" ? `tel:${channel.destination}` : channel.destination,
        sourceUrls: [channel.sourceUrl],
        sourceStatus: "source_verified" as const,
        operationalStatus: channel.operationalStatus,
        identificationRequirement: channel.identificationRequirement,
        anonymity: channel.anonymity,
        protocolExpectation: channel.protocolExpectation,
        notes: channel.notes,
        emergencyOnly: false,
        automationAllowed: false as const,
      }));
  }
  return listComunChildProtectionChannels()
    .filter(
      (channel) =>
        channel.sourceStatus === "source_verified" &&
        Boolean(channel.destination) &&
        (!channel.emergencyOnly || immediateDanger),
    )
    .map((channel) => ({
      id: channel.id,
      institution: channel.institution,
      category,
      channelType: "phone" as const,
      destination: `tel:${channel.destination}`,
      sourceUrls: [...channel.sourceUrls],
      sourceStatus: "source_verified" as const,
      operationalStatus: channel.operationalStatus,
      identificationRequirement: channel.identificationRequirement,
      anonymity: channel.anonymity,
      protocolExpectation: channel.protocolExpectation,
      notes: channel.notes,
      emergencyOnly: channel.emergencyOnly,
      automationAllowed: false as const,
    }));
}

export function findComunSensitiveInstitutionalChannel(
  category: SensitiveForwardingCategory,
  channelId: string,
  immediateDanger = false,
) {
  return listComunSensitiveInstitutionalChannels(category, immediateDanger).find(
    (channel) => channel.id === channelId,
  );
}

export function publicComunSensitiveInstitutionalChannel(
  channel: ComunSensitiveInstitutionalChannel,
) {
  const { destination: _destination, ...safe } = channel;
  return safe;
}
