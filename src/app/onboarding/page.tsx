import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { cleanNext } from "@/lib/next-path";
import { getCurrentUser } from "@/server/current-user";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ suivant?: string }> }) {
  const params = await searchParams;
  const next = params.suivant ? cleanNext(params.suivant, "") : "";
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/connexion?suivant=${encodeURIComponent(next)}` : "/connexion");
  if (user.onboarded) redirect(next || "/accueil");

  const steps = next ? ["Compte", "Profil", "Entente"] : ["Compte", "Profil", "Équipe", "Entente"];

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold tracking-[0.14em]">MISTERDIL</p>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Bienvenue, {user.name.split(" ")[0]}.</h1>
      <p className="mt-3 text-[#5e6875]">
        {next
          ? "Présentez-vous en quelques secondes, puis rejoignez l'entente à laquelle vous êtes invité."
          : "Présentez-vous, puis composez l'équipe de votre première entente."}
      </p>
      <ol className={`mt-6 grid gap-2 text-sm text-[#5e6875] ${next ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
        {steps.map((item, index) => (
          <li key={item} className={`rounded-lg border px-3 py-2 ${index === 1 ? "border-[#1e4ed8] bg-[#eef3ff] font-medium text-[#1e4ed8]" : "border-[#e6e8ee] bg-white"}`}>{index + 1}. {item}</li>
        ))}
      </ol>
      <div className="mt-8 rounded-xl border border-[#e6e8ee] bg-white p-6">
        <OnboardingForm name={user.name} next={next} />
      </div>
    </div>
  );
}
