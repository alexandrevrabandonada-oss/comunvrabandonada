export type SpecializedArchiveKind =
  | "artwork"
  | "oral_history"
  | "radio_program"
  | "radio_episode";

export type ArchivePublicationSignals = {
  itemType: string;
  lookupFailed?: boolean;
  artwork?: boolean;
  oralHistory?: boolean;
  radioProgram?: boolean;
  radioEpisode?: boolean;
};

export type ArchivePublicationBoundary = {
  genericPublisherAllowed: boolean;
  specializedKind: SpecializedArchiveKind | null;
  editorHref: string | null;
  editorLabel: string | null;
};

const genericPhotoDocumentTypes = new Set(["photograph", "document"]);

export function resolveArchivePublicationBoundary(
  id: string,
  signals: ArchivePublicationSignals,
): ArchivePublicationBoundary {
  if (signals.lookupFailed)
    return {
      genericPublisherAllowed: false,
      specializedKind: null,
      editorHref: null,
      editorLabel: null,
    };
  const specializedKind = detectSpecializedKind(signals);
  if (specializedKind) {
    const editor = specializedEditor(specializedKind, id);
    return {
      genericPublisherAllowed: false,
      specializedKind,
      ...editor,
    };
  }
  return {
    genericPublisherAllowed: genericPhotoDocumentTypes.has(signals.itemType),
    specializedKind: null,
    editorHref: null,
    editorLabel: null,
  };
}

function detectSpecializedKind(
  signals: ArchivePublicationSignals,
): SpecializedArchiveKind | null {
  if (signals.artwork || signals.itemType === "territorial_artwork")
    return "artwork";
  if (signals.oralHistory || signals.itemType === "oral_history")
    return "oral_history";
  if (signals.radioProgram || signals.itemType === "community_radio_program")
    return "radio_program";
  if (
    signals.radioEpisode ||
    ["community_radio_episode", "community_radio_clip"].includes(
      signals.itemType,
    )
  )
    return "radio_episode";
  return null;
}

function specializedEditor(kind: SpecializedArchiveKind, id: string) {
  if (kind === "artwork")
    return { editorHref: `/comun/admin/acervo/arte/${id}`, editorLabel: "Editar Arte" };
  if (kind === "oral_history")
    return {
      editorHref: `/comun/admin/acervo/historias-orais/${id}`,
      editorLabel: "Editar História Oral",
    };
  if (kind === "radio_program")
    return {
      editorHref: `/comun/admin/radio/programas/${id}`,
      editorLabel: "Editar programa de Rádio",
    };
  return {
    editorHref: `/comun/admin/radio/episodios/${id}`,
    editorLabel: "Editar episódio de Rádio",
  };
}
