import { communityOnboardingHref } from "./community-return";

export function resolveCommunitySignupDestination(input: {
  authenticated: boolean;
  onboardingCompleted: boolean;
  returnTo: string;
}) {
  if (!input.authenticated) return null;
  return input.onboardingCompleted
    ? input.returnTo
    : communityOnboardingHref(input.returnTo);
}
