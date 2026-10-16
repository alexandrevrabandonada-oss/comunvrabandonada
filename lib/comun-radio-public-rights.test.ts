import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ComunRadioPublicRights } from "../components/comun-radio-public-rights";

describe("public episode attribution and rights", () => {
  it.each([
    ["2026-10-01T23:30:00-03:00", "02/10/2026", "2026-10-02T02:30:00.000Z"],
    ["1970-01-01T00:00:00Z", "01/01/1970", "1970-01-01T00:00:00.000Z"],
  ])(
    "renders publication %s in UTC with a machine-readable instant",
    (publishedAt, label, instant) => {
      const html = renderToStaticMarkup(
        createElement(ComunRadioPublicRights, { publishedAt }),
      );
      expect(html).toContain(`dateTime="${instant}"`);
      expect(html).toContain(label);
    },
  );

  it.each([null, undefined, "", "  "])(
    "explicitly states missing publication (%s) without inventing a date",
    (publishedAt) => {
      const html = renderToStaticMarkup(
        createElement(ComunRadioPublicRights, { publishedAt }),
      );
      expect(html).toContain("Data de publicação não informada.");
      expect(html).not.toContain("<time");
    },
  );

  it.each([
    "invalid-publication-date",
    "2026-02-30T12:00:00Z",
    "2026-10-01T12:00:00",
  ])(
    "states invalid publication %s without rendering Invalid Date or a fallback instant",
    (publishedAt) => {
      const html = renderToStaticMarkup(
        createElement(ComunRadioPublicRights, { publishedAt }),
      );
      expect(html).toContain("Data de publicação inválida.");
      expect(html).not.toContain("Invalid Date");
      expect(html).not.toContain("<time");
    },
  );

  it("shows the actual public credit, composition and license without rendering private or unapproved rows", () => {
    const html = renderToStaticMarkup(
      createElement(ComunRadioPublicRights, {
        credits: [
          {
            position: 1,
            public_credit: "Public voice",
            credit_role: "Host",
            public_visibility: "public",
          },
          {
            position: 2,
            public_credit: "Private person",
            credit_role: "Guest",
            public_visibility: "private",
          },
        ],
        music: [
          {
            title_public: "Approved song",
            composer_public: "Public composer",
            license_public: "Listening only <no redistribution>",
            rights_status: "approved",
          },
          {
            title_public: "Unreviewed song",
            license_public: "Unreviewed license",
            rights_status: "pending",
          },
        ],
      }),
    );
    expect(html).toContain("Public voice");
    expect(html).toContain("Public composer");
    expect(html).toContain("Listening only &lt;no redistribution&gt;");
    expect(html).not.toContain("Private person");
    expect(html).not.toContain("Unreviewed song");
    expect(html).not.toContain("Unreviewed license");
  });

  it("never invents a reuse license when public conditions are absent", () => {
    const html = renderToStaticMarkup(
      createElement(ComunRadioPublicRights, {
        music: [
          {
            title_public: "Verified song",
            rights_status: "public_domain_verified",
            license_public: "  ",
          },
        ],
      }),
    );
    expect(html).toContain("Verified song");
    expect(html).toContain("Condições específicas não informadas.");
    expect(html).toContain("não autoriza reutilização.");
    expect(html).not.toContain("Licença/condições informadas:");
  });

  it("states missing public attribution without exposing a private credit", () => {
    const html = renderToStaticMarkup(
      createElement(ComunRadioPublicRights, {
        credits: [
          {
            position: 1,
            public_credit: "Private person",
            credit_role: "Guest",
            public_visibility: "private",
          },
        ],
      }),
    );
    expect(html).toContain("Nenhum crédito público informado.");
    expect(html).toContain("Nenhuma música autorizada informada.");
    expect(html).not.toContain("Private person");
  });
});
