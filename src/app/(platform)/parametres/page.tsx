import { Card } from "@/components/ui";
import { PasswordForm, ProfileForm } from "@/components/settings-forms";
import { requireUser } from "@/server/current-user";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const user = await requireUser();
  const ai = Boolean(process.env.OPENAI_API_KEY?.trim());
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
      <Card className="p-6">
        <h2 className="font-semibold">Profil</h2>
        <div className="mt-4">
          <ProfileForm user={{ name: user.name, jobTitle: user.jobTitle, phone: user.phone, organization: user.organization?.name ?? "" }} />
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="font-semibold">Mot de passe</h2>
        <div className="mt-4"><PasswordForm /></div>
      </Card>
      <Card className="p-6 text-sm leading-6 text-[#5e6875]">
        <h2 className="font-semibold text-[#12151a]">Assistant</h2>
        <p className="mt-2">{ai ? "Une clé OpenAI est configurée. Elle reste côté serveur." : "Aucune clé OpenAI n'est configurée. L'assistant utilise le contexte du document. Ajoutez OPENAI_API_KEY dans l'environnement pour brancher un modèle."}</p>
        <p className="mt-2">Modèle prévu : {process.env.OPENAI_MODEL || "gpt-4o-mini"}.</p>
      </Card>
    </div>
  );
}
