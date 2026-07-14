export type Community = {
  slug: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  mainCta: string;
  icon: string;
  accent: string;
};

export type Issue = {
  slug: string;
  communitySlug: string;
  title: string;
  summary: string;
  status: "receiving_reports" | "checking" | "became_post" | "preparing_dossier" | "forwarded" | "monitoring" | "archived";
  timeline: string[];
  usefulMaterials: string[];
  nextSteps: string;
};

export type Dossier = {
  slug: string;
  issueSlug: string;
  title: string;
  executiveSummary: string;
  contextText: string;
  timeline: string[];
  patterns: string[];
  relatedReports: Array<{
    protocol: string;
    title: string;
    publicText: string;
  }>;
  sources: string[];
  forwardingLog: string[];
  openQuestions: string[];
  status: "draft" | "published";
};

export type PublicReport = {
  id: string;
  protocol: string;
  community_slug: string;
  issue_slug: string | null;
  title: string | null;
  public_text: string | null;
  period_text: string | null;
  approximate_location: string | null;
  neighborhood: string | null;
  status: string;
  risk_level: string;
  created_at: string;
  published_at: string | null;
  quick_report?: boolean;
  has_attachments?: boolean;
  photo_count?: number;
};

export type AdminReport = PublicReport & {
  raw_text: string;
  involved_entity: string | null;
  is_anonymous: boolean;
  can_publish_sanitized: boolean;
  accepts_contact: boolean;
  private_contact: string | null;
  internal_notes: string | null;
  quick_report: boolean;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  location_source: string | null;
  public_location_level: string;
  photo_count: number;
  has_attachments: boolean;
  source_channel: string | null;
  pending_attachment_count?: number;
};

export type AdminReportAttachment = {
  id: string;
  report_id: string;
  storage_bucket: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  attachment_type: string;
  public_approved: boolean;
  review_status: "pending" | "approved_private" | "needs_redaction" | "public_ready" | "rejected";
  public_storage_bucket: string | null;
  public_storage_path: string | null;
  public_mime_type: string | null;
  public_size_bytes: number | null;
  needs_redaction: boolean;
  redaction_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  public_approved_at: string | null;
  created_at: string;
  signed_url?: string | null;
  public_signed_url?: string | null;
};

export type AdminAttachmentQueueItem = AdminReportAttachment & {
  report: Pick<
    AdminReport,
    "id" | "protocol" | "community_slug" | "issue_slug" | "title" | "created_at" | "quick_report"
  > | null;
};

export type PublicSafeAttachment = {
  id: string;
  report_id: string;
  mime_type: string | null;
  size_bytes: number | null;
  signed_url: string | null;
};

export type PublicProtocolStatus =
  | "received"
  | "under_review"
  | "needs_more_info"
  | "sanitized"
  | "published"
  | "linked_to_issue"
  | "archived"
  | "not_found"
  | "invalid"
  | "rate_limited";

export type PublicProtocolReport = {
  protocol: string;
  status: PublicProtocolStatus;
  community_slug: string | null;
  issue_slug: string | null;
  title: string | null;
  public_text: string | null;
  period_text: string | null;
  approximate_location: string | null;
  neighborhood: string | null;
  created_at: string | null;
  published_at: string | null;
  public_message: string;
  state_label: string;
  is_publicly_available: boolean;
  found: boolean;
};

export type OfficialProtocolStatus =
  | "draft"
  | "text_generated"
  | "sent_by_user"
  | "official_protocol_informed"
  | "waiting_response"
  | "response_received"
  | "satisfactory_response"
  | "unsatisfactory_response"
  | "overdue"
  | "resolved"
  | "unresolved"
  | "archived";

export type OfficialProtocol = {
  id: string;
  report_id: string;
  comun_protocol: string;
  channel: string;
  agency: string | null;
  official_protocol_number: string | null;
  generated_text: string | null;
  submitted_by_user: boolean;
  submitted_at: string | null;
  expected_response_at: string | null;
  status: OfficialProtocolStatus;
  response_text: string | null;
  response_received_at: string | null;
  satisfaction: "satisfactory" | "unsatisfactory" | "partial" | "unknown" | null;
  public_summary: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicOfficialProtocol = Pick<
  OfficialProtocol,
  | "comun_protocol"
  | "channel"
  | "agency"
  | "official_protocol_number"
  | "generated_text"
  | "submitted_by_user"
  | "submitted_at"
  | "expected_response_at"
  | "status"
  | "response_received_at"
  | "satisfaction"
  | "public_summary"
  | "created_at"
  | "updated_at"
>;

export type PautaSpaceStatus = "observing" | "organizing" | "drafting" | "pressuring" | "resolved" | "unresolved" | "archived";
export type PautaContributionType = "relato" | "evidencia" | "proposta" | "duvida" | "contraponto" | "encaminhamento" | "tarefa_oferecida";
export type PautaContributionStatus = "pending" | "approved" | "rejected" | "archived";
export type PautaTaskStatus = "open" | "in_progress" | "done" | "blocked" | "archived";
export type PautaDossierStatus = "draft" | "in_review" | "ready" | "archived";
export type PautaDossierReviewStatus = "draft" | "editorial_review" | "changes_requested" | "approved" | "published" | "unpublished" | "archived";
export type PautaDossierReviewStage = "factual_review" | "editorial_review";
export type PautaDossierReviewDecision = "approved" | "changes_requested" | "rejected";
export type PautaDossierReviewPriority = "low" | "normal" | "high" | "urgent";
export type PautaDossierPublicationSnapshotStatus = "published" | "superseded" | "unpublished" | "rollback";
export type ComunAdminNotificationKind =
  | "dossier_factual_assigned"
  | "dossier_editorial_assigned"
  | "dossier_due_today"
  | "dossier_overdue"
  | "dossier_changes_requested"
  | "dossier_ready_to_publish"
  | "dossier_blocked_same_reviewer"
  | "dossier_due_date_changed"
  | "dossier_priority_high";
export type ComunAdminNotificationStatus = "unread" | "read" | "archived";
export type ComunAdminProfileRole = "admin" | "editor" | "factual_reviewer" | "editorial_reviewer" | "publisher" | "viewer";

export type PautaSpace = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  category: string | null;
  community: string | null;
  status: PautaSpaceStatus;
  visibility: "public" | "internal" | "archived";
  public_synthesis: string | null;
  next_step: string | null;
  created_from_signal: string | null;
  editorial_checklist: string[];
  created_at: string;
  updated_at: string;
};

export type PautaContribution = {
  id: string;
  pauta_id: string;
  contribution_type: PautaContributionType;
  author_alias: string | null;
  body: string;
  contact_private: string | null;
  status: PautaContributionStatus;
  risk_level: "normal" | "attention" | "high";
  risk_reasons: string[];
  moderation_priority: "normal" | "review_first" | "possible_abuse";
  submitter_hash: string | null;
  user_agent_hash: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  moderator_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PautaTask = {
  id: string;
  pauta_id: string;
  title: string;
  description: string | null;
  status: PautaTaskStatus;
  help_needed: boolean;
  owner_alias: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PautaSynthesisVersion = {
  id: string;
  pauta_id: string;
  previous_public_synthesis: string | null;
  new_public_synthesis: string | null;
  previous_next_step: string | null;
  new_next_step: string | null;
  editor_note: string | null;
  created_at: string;
};

export type PautaEvidenceItem = {
  id: string;
  pauta_id: string;
  source_type: "contribution" | "report" | "official_protocol" | "manual" | "external_reference";
  source_id: string | null;
  title: string;
  summary: string | null;
  evidence_type: "relato" | "foto_segura" | "protocolo" | "resposta_oficial" | "dado_agregado" | "documento" | "testemunho" | "outro";
  sensitivity: "public_safe" | "needs_review" | "private_only";
  status: "candidate" | "approved" | "rejected" | "archived";
  public_note: string | null;
  internal_note: string | null;
  created_at: string;
  updated_at: string;
};

export type PautaDossier = {
  id: string;
  pauta_id: string;
  slug: string;
  title: string;
  status: PautaDossierStatus;
  review_status: PautaDossierReviewStatus;
  reviewed_by_editor_at: string | null;
  approved_for_publication_at: string | null;
  published_at: string | null;
  unpublished_at: string | null;
  public_slug: string | null;
  public_title: string | null;
  public_body: string | null;
  public_summary: string | null;
  publication_notes: string | null;
  executive_summary: string | null;
  problem_statement: string | null;
  affected_communities: string | null;
  evidence_summary: string | null;
  official_protocols_summary: string | null;
  demands: string | null;
  next_steps: string | null;
  public_version: string | null;
  internal_notes: string | null;
  factual_reviewer_assigned: string | null;
  editorial_reviewer_assigned: string | null;
  review_priority: PautaDossierReviewPriority;
  review_due_at: string | null;
  review_notes_internal: string | null;
  factual_reviewer_assigned_user_id: string | null;
  editorial_reviewer_assigned_user_id: string | null;
  final_publication_checklist: Record<string, boolean>;
  final_publication_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PautaDossierEvidence = {
  id: string;
  dossier_id: string;
  evidence_id: string;
  position: number;
  included_note: string | null;
  created_at: string;
};

export type PautaDossierReview = {
  id: string;
  dossier_id: string;
  review_stage: PautaDossierReviewStage;
  reviewer_name: string;
  reviewer_role: string | null;
  reviewer_user_id: string | null;
  decision: PautaDossierReviewDecision;
  checklist: Record<string, boolean>;
  notes: string | null;
  created_at: string;
};

export type ComunAdminNotification = {
  id: string;
  kind: ComunAdminNotificationKind;
  target_type: string;
  target_id: string;
  title: string;
  body: string | null;
  priority: PautaDossierReviewPriority;
  assigned_to: string | null;
  assigned_to_user_id: string | null;
  status: ComunAdminNotificationStatus;
  created_at: string;
  read_at: string | null;
};

export type ComunAdminProfile = {
  id: string;
  auth_user_id: string | null;
  display_name: string;
  email: string;
  role: ComunAdminProfileRole;
  active: boolean;
  operational_note: string | null;
  created_at: string;
  updated_at: string;
};

export type PautaDossierPublicationSnapshot = {
  id: string;
  dossier_id: string;
  public_title: string;
  public_summary: string;
  public_body: string;
  public_slug: string;
  published_by_user_id: string | null;
  published_by_name_snapshot: string | null;
  published_at: string;
  unpublished_at: string | null;
  unpublished_by_user_id: string | null;
  unpublish_reason: string | null;
  snapshot_status: PautaDossierPublicationSnapshotStatus;
  public_change_note: string | null;
  public_version_label: string;
  public_updated_at: string | null;
  created_at: string;
};

export type PublicDossierFeature = {
  id: string;
  snapshot_id: string;
  slot: string;
  public_label: string | null;
  public_note: string | null;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};
