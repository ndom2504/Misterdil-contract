import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { getCurrentUser } from "@/server/current-user";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  if (user.onboarded) redirect("/accueil");

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold tracking-[0.14em]">MISTERDIL</p>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Bienvenue, {user.name.split(" ")[0]}.</h1>
      <p className="mt-3 text-[#5e6875]">Quatre informations suffisent pour ouvrir votre espace et préparer une première entente.</p>
      <ol className="mt-6 grid grid-cols-2 gap-2 text-sm text-[#5e6875] sm:grid-cols-4">
        {["Compte", "Organisation", "Profil", "Espace"].map((item, index) => (
          <li key={item} className="rounded-lg border border-[#e6e8ee] bg-white px-3 py-2">{index + 1}. {item}</li>
        ))}
      </ol>
      <div className="mt-8 rounded-xl border border-[#e6e8ee] bg-white p-6">
        <OnboardingForm />
      </div>
    </div>
  );
}
