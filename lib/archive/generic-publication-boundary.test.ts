import { describe, expect, it } from "vitest";
import { resolveArchivePublicationBoundary } from "./generic-publication-boundary";

describe("generic archive publication boundary", () => {
  it.each([
    ["territorial_artwork", "artwork", "Editar Arte"],
    ["oral_history", "oral_history", "Editar História Oral"],
    ["community_radio_program", "radio_program", "Editar programa de Rádio"],
    ["community_radio_episode", "radio_episode", "Editar episódio de Rádio"],
  ])("routes %s to its specialized publisher", (itemType, kind, label) => {
    const boundary = resolveArchivePublicationBoundary("item-id", { itemType });
    expect(boundary).toMatchObject({
      genericPublisherAllowed: false,
      specializedKind: kind,
      editorLabel: label,
    });
  });

  it("fails closed when a specialized child exists under a mismatched item type", () => {
    expect(
      resolveArchivePublicationBoundary("item-id", {
        itemType: "photograph",
        artwork: true,
      }),
    ).toMatchObject({ genericPublisherAllowed: false, specializedKind: "artwork" });
  });

  it("fails closed when specialized metadata cannot be classified", () => {
    expect(
      resolveArchivePublicationBoundary("item-id", {
        itemType: "photograph",
        lookupFailed: true,
      }),
    ).toMatchObject({ genericPublisherAllowed: false, specializedKind: null });
  });

  it.each(["photograph", "document"])(
    "preserves the generic photo/document publisher for %s",
    (itemType) => {
      expect(
        resolveArchivePublicationBoundary("item-id", { itemType }),
      ).toMatchObject({ genericPublisherAllowed: true, specializedKind: null });
    },
  );

  it.each(["place", "artist", "music_release", "video", "poster", "newspaper", "other"])(
    "does not infer a generic publisher for unsupported type %s",
    (itemType) => {
      expect(
        resolveArchivePublicationBoundary("item-id", { itemType }),
      ).toMatchObject({ genericPublisherAllowed: false, specializedKind: null });
    },
  );
});
