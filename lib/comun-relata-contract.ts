export const COMUN_RELATA_RULE_VERSION = "relata-routing-v1" as const;

export type RelataCategory =
  | "public_lighting"
  | "power_distribution"
  | "electrical_hazard"
  | "active_fire"
  | "smoke_or_environmental_trace"
  | "other";

export type RelataUrgency = "routine" | "attention" | "urgent" | "emergency";

export type PrivacyClass =
  | "public_safe"
  | "public_after_sanitization"
  | "restricted"
  | "sensitive"
  | "high_risk";

export type RelataStatus =
  | "draft"
  | "triage"
  | "awaiting_person"
  | "routed"
  | "human_review"
  | "resolved"
  | "withdrawn";

export type ProtocolKind = "comun" | "official";

export type Report = {
  id: string;
  summary: string;
  category?: RelataCategory;
  privacyClass: PrivacyClass;
  status: RelataStatus;
  createdAt: string;
  privateLocation?: PrivateLocation;
  publicSnapshot?: PublicSnapshot;
};

export type Case = {
  id: string;
  reportId: string;
  status: RelataStatus;
  urgency: RelataUrgency;
  assignedAgencyType?: Agency["kind"];
  ruleVersion: string;
};

export type Agency = {
  id: string;
  kind:
    | "public_lighting"
    | "power_distribution"
    | "emergency"
    | "environmental"
    | "community_review";
  displayName: string;
  verified: boolean;
};

export type Channel = {
  id: string;
  agencyId: string;
  label: string;
  kind: "fixture" | "future_verified";
  verified: boolean;
  sourceStatus: "unverified_fixture" | "pending_verification" | "verified";
  endpoint?: never;
};

export type RoutingRule = {
  id: string;
  version: string;
  category: RelataCategory;
  agencyKind: Agency["kind"];
  urgency: RelataUrgency;
  requiresHumanReview: boolean;
};

export type RoutingDecision = {
  category: RelataCategory;
  urgency: RelataUrgency;
  agencyKind: Agency["kind"];
  explanation: string;
  nextStep: string;
  missingInformation: string[];
  privacyClass: PrivacyClass;
  publication: "never_automatic" | "sanitized_candidate" | "public_safe";
  requiresHumanReview: boolean;
  ruleVersion: string;
  confidence: "high" | "medium" | "low";
};

export type Submission = {
  id: string;
  reportId: string;
  protocol: Protocol;
  consent: Consent;
  attachments: Attachment[];
  status: RelataStatus;
  localOnly: true;
};

export type Protocol = {
  value: string;
  kind: ProtocolKind;
  isOfficial: boolean;
  localOnly: boolean;
  officialProtocol: null | string;
};

export type StatusEvent = {
  id: string;
  status: RelataStatus;
  occurredAt: string;
  actor: "person" | "system_preview" | "human_review";
  opaqueReference: string;
};

export type Consent = {
  accepted: boolean;
  version: string;
  allowsPublicProjection: boolean;
  allowsOfficialForwarding: false;
};

export type Attachment = {
  id: string;
  mimeType: string;
  privacyClass: PrivacyClass;
  originalPrivate: true;
  publicDerivative: false;
};

export type PrivateLocation = {
  precision: "exact" | "address" | "device" | "unknown";
  value: string;
  privacyClass: "sensitive" | "high_risk";
};

export type PublicLocation = {
  precision: "neighborhood" | "block" | "approximate" | "none";
  label?: string;
};

export type PublicSnapshot = {
  summary: string;
  location: PublicLocation;
  sanitized: true;
  reviewed: false;
};

export type EscalationRule = {
  id: string;
  from: RelataUrgency;
  to: RelataUrgency;
  trigger: string;
  requiresHumanReview: true;
};

export type RelataInput = {
  text: string;
  answers?: Record<string, string>;
  hasExactLocation?: boolean;
  includesPersonData?: boolean;
  includesChildData?: boolean;
  includesHealthData?: boolean;
  includesThreatOrRetaliation?: boolean;
  hasAttachment?: boolean;
};
