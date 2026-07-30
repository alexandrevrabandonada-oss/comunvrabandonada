import { z } from "zod";
import {
  pautaModuleTypes,
  type PautaModuleType,
} from "@/lib/comun/pauta-module-registry";

const routeSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^\/comun(?:\/|$)/, "A rota deve permanecer no COMUN.");
const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const labelSchema = z.string().trim().min(2).max(160);
const stateSchema = z.string().trim().min(2).max(80);

export const miniappCapabilities = [
  "map",
  "media_upload",
  "moderation",
  "field_verification",
  "territorial_grouping",
  "collective_action",
  "official_protocol",
  "public_result",
  "collective_memory",
] as const;

export type MiniappCapability = (typeof miniappCapabilities)[number];

export const miniappDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: slugSchema,
    slug: slugSchema,
    title: labelSchema,
    summary: z.string().trim().min(10).max(500),
    canonicalModuleType: z.enum(pautaModuleTypes),
    routes: z
      .object({
        home: routeSchema,
        contribution: routeSchema,
        textAlternative: routeSchema,
        participation: routeSchema,
        inbox: routeSchema,
        administration: routeSchema,
      })
      .strict(),
    context: z
      .object({
        pautaSlug: slugSchema,
        communitySource: z.literal("canonical_pauta"),
        territory: z
          .object({
            slug: slugSchema,
            label: labelSchema,
            coverageLabel: labelSchema,
          })
          .strict(),
      })
      .strict(),
    primaryAction: z
      .object({
        label: labelSchema,
        route: routeSchema,
      })
      .strict(),
    contribution: z
      .object({
        mode: z.enum(["anonymous_limited", "authenticated", "mixed"]),
        states: z.array(stateSchema).min(2),
      })
      .strict(),
    moderationStates: z.array(stateSchema).min(2),
    followUpStates: z.array(stateSchema).min(2),
    permissions: z
      .object({
        contribute: z.array(stateSchema).min(1),
        moderate: z.array(stateSchema).min(1),
        operate: z.array(stateSchema).min(1),
      })
      .strict(),
    publicProjection: z.array(stateSchema).min(1),
    politicalLinks: z
      .object({
        collectiveAction: z.boolean(),
        protocol: z.boolean(),
        result: z.boolean(),
        memory: z.boolean(),
      })
      .strict(),
    inboxEvents: z.array(stateSchema).min(1),
    auditEvents: z.array(stateSchema).min(1),
    privacy: z
      .object({
        privateFields: z.array(stateSchema).min(1),
        retentionPolicy: labelSchema,
      })
      .strict(),
    capabilities: z.array(z.enum(miniappCapabilities)),
  })
  .strict()
  .superRefine((definition, context) => {
    if (definition.primaryAction.route !== definition.routes.contribution) {
      context.addIssue({
        code: "custom",
        path: ["primaryAction", "route"],
        message: "A ação principal deve usar a rota canônica de contribuição.",
      });
    }
    if (definition.routes.home === definition.routes.textAlternative) {
      context.addIssue({
        code: "custom",
        path: ["routes", "textAlternative"],
        message: "A alternativa textual deve possuir deep link próprio.",
      });
    }
    const forbiddenPublicFields = new Set([
      "private_geometry_geojson",
      "object_key",
      "member_user_id",
      "note_private",
      "raw_text",
      "signed_url",
    ]);
    for (const field of definition.publicProjection) {
      if (forbiddenPublicFields.has(field)) {
        context.addIssue({
          code: "custom",
          path: ["publicProjection"],
          message: "A projeção pública contém campo privado.",
        });
      }
    }
  });

export type MiniappDefinition = z.infer<typeof miniappDefinitionSchema> & {
  canonicalModuleType: PautaModuleType;
};

export function defineMiniapp(input: MiniappDefinition): MiniappDefinition {
  return Object.freeze(miniappDefinitionSchema.parse(input));
}

export function miniappDeepLink(
  definition: MiniappDefinition,
  destination: keyof MiniappDefinition["routes"],
) {
  return definition.routes[destination];
}
