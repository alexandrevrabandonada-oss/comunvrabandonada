export const COMUN_RELATA_RULE_VERSION = "relata-routing-v1" as const;

export type RelataCategory =
  | "public_lighting"
  | "power_distribution"
  | "water_supply"
  | "public_transport"
  | "electrical_hazard"
  | "active_fire"
  | "smoke_or_environmental_trace"
  | "sidewalk_accessibility"
  | "waste_or_debris"
  | "public_health"
  | "public_education"
  | "workplace"
  | "environmental_pollution"
  | "other";

export type RelataUrgency = "routine" | "attention" | "urgent" | "emergency";

export type PrivacyClass =
  | "public_safe"
  | "public_after_sanitization"
  | "restricted"
  | "sensitive"
  | "high_risk";

export type RelataStatus =
  | "captured_private"
  | "draft"
  | "triage"
  | "awaiting_person"
  | "routed"
  | "stored_private"
  | "withdrawn";

export type FutureRelataStatus =
  | "ready_for_submission"
  | "submitted"
  | "official_protocol_received"
  | "under_review"
  | "resolved"
  | "deadline_expired"
  | "escalated"
  | "published";

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

export type CollectiveCaseMatchDecision =
  | "auto_link_high_confidence"
  | "candidate_medium_confidence"
  | "new_collective_case"
  | "never_auto_link"
  | "human_review_future";

export type CollectiveCase = {
  id: string;
  category: RelataCategory;
  collectiveUrgency: RelataUrgency;
  ruleVersion: string;
  activeMembershipCount: number;
  confidence: "high" | "medium" | "low";
  futureMapEligibility: false;
  reviewState: "not_required" | "future_review" | "blocked_by_safety";
};

export type CollectiveCaseMembership = {
  collectiveCaseId: string;
  individualCaseId: string;
  role: "origin" | "corroborating" | "candidate";
  method: CollectiveCaseMatchDecision;
  confidence: "high" | "medium" | "low";
  ruleVersion: string;
  active: boolean;
  createdAt: string;
  endedAt: string | null;
  sanitizedReason: string | null;
};

export type Agency = {
  id: string;
  kind:
    | "public_lighting"
    | "power_distribution"
    | "water_sanitation"
    | "public_transport"
    | "emergency"
    | "environmental"
    | "community_review";
  displayName: string;
  sphere:
    "municipal" | "state" | "federal" | "private_concessionaire" | "community";
  territory: string;
};

export type Channel = {
  id: string;
  agencyId: string;
  label: string;
  service: string;
  category: RelataCategory | "cross_category";
  channelType: "phone" | "whatsapp" | "web" | "ombudsman" | "emergency";
  channelValue: string | null;
  requirements: string[];
  identification: "required" | "optional" | "source_unclear";
  anonymity: "accepted" | "not_available" | "source_unclear";
  confidentiality: "stated" | "not_stated" | "source_unclear";
  protocolExpectation: "expected" | "not_promised" | "source_unclear";
  followUp: "available" | "not_available" | "source_unclear";
  priorProtocolRequired: boolean;
  hours: string | null;
  sourceIds: string[];
  sourceVerified: boolean;
  operationallyChecked: boolean;
  operationalStatus:
    | "source_only"
    | "conflicting_official_sources"
    | "unavailable"
    | "expired"
    | "operationally_confirmed";
  sourceConflict: boolean;
  lastSourceReviewAt: string;
  lastOperationalCheckAt: string | null;
  reviewDueAt: string;
  verifier: string;
  state: "review_required" | "catalogued" | "disabled";
  disabledReason: string | null;
  internalNote: string;
  version: string;
  emergency: boolean;
  immediateAssistedAction: boolean;
  queueable: boolean;
  automationAllowed: false;
};

export type RoutingRule = {
  id: string;
  version: string;
  category: RelataCategory;
  agencyKind: Agency["kind"];
  urgency: RelataUrgency;
  requiresHumanReview: boolean;
};

export type AllowedAdaptiveAnswerKey =
  | "homes_power"
  | "smoke_active"
  | "blocked";

export type AdaptiveQuestion = {
  id: "dark_street_power_scope" | "smoke_active_state";
  prompt: string;
  answerKey: AllowedAdaptiveAnswerKey;
  options: Array<{
    value: string;
    label: string;
  }>;
  blocking: false;
};

export type RoutingDecision = {
  category: RelataCategory;
  urgency: RelataUrgency;
  agencyKind: Agency["kind"];
  explanation: string;
  nextStep: string;
  missingInformation: string[];
  adaptiveQuestions: AdaptiveQuestion[];
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
  answers?: Partial<Record<AllowedAdaptiveAnswerKey, string>> &
    Record<string, string>;
  hasExactLocation?: boolean;
  includesPersonData?: boolean;
  includesChildData?: boolean;
  includesHealthData?: boolean;
  includesThreatOrRetaliation?: boolean;
  hasAttachment?: boolean;
};

export type RelataCaptureInput = Omit<RelataInput, "text"> & {
  text: string | null;
};
