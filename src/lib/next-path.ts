export function cleanNext(value: string, fallback = "/accueil") {
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) return value;
  return fallback;
}

export function onboardingPath(next: string) {
  const clean = next ? cleanNext(next, "") : "";
  return clean && clean !== "/accueil" ? `/onboarding?suivant=${encodeURIComponent(clean)}` : "/onboarding";
}
