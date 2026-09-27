import { LoginForm } from "@/components/auth-forms";
import { AuthStage } from "@/components/auth-stage";

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ suivant?: string }> }) {
  const params = await searchParams;
  return (
    <AuthStage>
      <LoginForm next={params.suivant} />
    </AuthStage>
  );
}
