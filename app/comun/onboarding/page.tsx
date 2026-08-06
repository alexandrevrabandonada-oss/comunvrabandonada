import { ComunShell, Section } from "@/components/comun-shell";
import { CommunityOnboardingFlow } from "@/components/community-onboarding-flow";
import { requireCommunitySession } from "@/lib/community-auth";
import { safeCommunityReturn } from "@/lib/community-return";
import { isComunTerritoryProfileEnabled } from "@/lib/comun-territory-profile";

export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeCommunityReturn(params.returnTo);
  const { profile } = await requireCommunitySession(
    `/comun/onboarding?returnTo=${encodeURIComponent(returnTo)}`,
  );
  return (
    <ComunShell>
      <Section>
        <CommunityOnboardingFlow
          displayName={profile?.display_name ?? "Pessoa participante"}
          returnTo={returnTo}
          territoryEnabled={isComunTerritoryProfileEnabled()}
        />
      </Section>
    </ComunShell>
  );
}
