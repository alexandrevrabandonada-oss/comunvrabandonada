import "server-only";
import { hybridPublicSearch } from "@/lib/civic-intelligence/search";

export async function getPublicRelatedContent(input: {
  title: string;
  currentRoute: string;
  pautaId?: string;
}) {
  try {
    const response = await hybridPublicSearch({
      query: input.title,
      pautaId: input.pautaId,
      semantic: true,
      timeoutMs: 1200,
    });
    return response.results
      .filter((result) => result.href !== input.currentRoute)
      .slice(0, 4);
  } catch {
    return [];
  }
}
