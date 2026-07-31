import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type ProviderHealth = {
  available: boolean;
  code: "available" | "disabled" | "unavailable" | "invalid_dimensions";
  model: string;
  dimensions: number;
};

export type ComunEmbeddingProvider = {
  id: string;
  model: string;
  dimensions: number;
  embedDocuments(inputs: string[]): Promise<number[][]>;
  embedQuery(input: string): Promise<number[]>;
  healthcheck(): Promise<ProviderHealth>;
};

export type GroundedAnswerInput = {
  query: string;
  publicSourceRoutes: string[];
};
export type GroundedAnswerResult = { answer: string; sourceRoutes: string[] };
export type ComunGenerationProvider = {
  id: string;
  enabled: boolean;
  generateGroundedAnswer(
    input: GroundedAnswerInput,
  ): Promise<GroundedAnswerResult>;
};

const MODEL = "gte-small";
const DIMENSIONS = 384;

function validateVector(vector: unknown): number[] {
  if (
    !Array.isArray(vector) ||
    vector.length !== DIMENSIONS ||
    vector.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("COMUN_EMBEDDING_INVALID_DIMENSIONS");
  }
  return vector as number[];
}

export class SupabaseNativeEmbeddingProvider implements ComunEmbeddingProvider {
  readonly id = "supabase-native";
  readonly model = MODEL;
  readonly dimensions = DIMENSIONS;

  private async invoke(inputs: string[], kind: "query" | "documents") {
    if (process.env.COMUN_CIVIC_EMBEDDINGS_V1 === "disabled") {
      throw new Error("COMUN_EMBEDDINGS_DISABLED");
    }
    const supabase = createServiceSupabaseClient();
    if (!supabase) throw new Error("COMUN_EMBEDDING_PROVIDER_UNAVAILABLE");
    const sanitizedInputs = inputs.map((input) => input.trim().slice(0, 4000));
    if (
      !sanitizedInputs.length ||
      sanitizedInputs.some((input) => input.length < 2)
    ) {
      throw new Error("COMUN_EMBEDDING_INPUT_INVALID");
    }
    const { data, error } = await supabase.functions.invoke(
      "comun-civic-embed",
      {
        body: { kind, inputs: sanitizedInputs, publicProjection: true },
      },
    );
    if (
      error ||
      !data ||
      data.model !== MODEL ||
      data.dimensions !== DIMENSIONS
    ) {
      throw new Error("COMUN_EMBEDDING_PROVIDER_UNAVAILABLE");
    }
    if (
      !Array.isArray(data.embeddings) ||
      data.embeddings.length !== inputs.length
    ) {
      throw new Error("COMUN_EMBEDDING_INVALID_DIMENSIONS");
    }
    return data.embeddings.map(validateVector);
  }

  embedDocuments(inputs: string[]) {
    return this.invoke(inputs.slice(0, 16), "documents");
  }

  async embedQuery(input: string) {
    return (await this.invoke([input], "query"))[0];
  }

  async healthcheck(): Promise<ProviderHealth> {
    if (process.env.COMUN_CIVIC_EMBEDDINGS_V1 === "disabled") {
      return {
        available: false,
        code: "disabled",
        model: MODEL,
        dimensions: DIMENSIONS,
      };
    }
    try {
      await this.embedQuery("mobilidade urbana");
      return {
        available: true,
        code: "available",
        model: MODEL,
        dimensions: DIMENSIONS,
      };
    } catch (error) {
      return {
        available: false,
        code:
          error instanceof Error && error.message.includes("DIMENSIONS")
            ? "invalid_dimensions"
            : "unavailable",
        model: MODEL,
        dimensions: DIMENSIONS,
      };
    }
  }
}

export const disabledGenerationProvider: ComunGenerationProvider = {
  id: "disabled",
  enabled: false,
  async generateGroundedAnswer() {
    throw new Error("COMUN_CIVIC_GROUNDED_ANSWERS_DISABLED");
  },
};
