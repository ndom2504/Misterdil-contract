import { RegisterForm } from "@/components/auth-forms";
import { AuthStage } from "@/components/auth-stage";

export const metadata = { title: "Créer un compte" };

export default function RegisterPage() {
  return (
    <AuthStage>
      <RegisterForm />
    </AuthStage>
  );
}
