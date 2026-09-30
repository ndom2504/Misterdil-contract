import { LoginForm } from "@/components/auth-forms";
import { AuthStage } from "@/components/auth-stage";
import { MICROSOFT_NOTICES } from "@/lib/microsoft-desk";

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ suivant?: string; microsoft?: string; compte?: string }> }) {
  const params = await searchParams;
  const notice =
    params.compte === "ferme"
      ? "Votre session a pris fin : ce compte a été désactivé ou supprimé. Contactez le support Misterdil si besoin."
      : params.microsoft && params.microsoft !== "ok"
        ? MICROSOFT_NOTICES[params.microsoft]
        : undefined;
  return (
    <AuthStage>
      <LoginForm next={params.suivant} notice={notice} />
    </AuthStage>
  );
}
