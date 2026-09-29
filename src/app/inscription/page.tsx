import { RegisterForm } from "@/components/auth-forms";
import { AuthStage } from "@/components/auth-stage";
import { cleanNext } from "@/lib/next-path";
import { findInvitation } from "@/server/invitations";

export const metadata = { title: "Créer un compte" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ suivant?: string }> }) {
  const params = await searchParams;
  const next = params.suivant ? cleanNext(params.suivant, "") : "";
  const token = /^\/invitation\/([^/?#]+)/.exec(next)?.[1];
  const invitation = token ? await findInvitation(token) : null;
  const pending = invitation?.status === "PENDING" ? invitation : null;

  return (
    <AuthStage>
      <RegisterForm next={next} email={pending?.email} invitedBy={pending?.invitedBy.name} />
    </AuthStage>
  );
}
