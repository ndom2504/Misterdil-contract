import Link from "next/link";
import { AuthStage } from "@/components/auth-stage";
import { Logo } from "@/components/logo";

export const metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <AuthStage>
      <div className="rounded-[28px] bg-white p-7 text-[#12151a] shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Logo />
          <h2 className="mt-5 text-xl font-semibold">Mot de passe oublié</h2>
          <p className="mt-2 text-sm leading-6 text-[#5e6875]">
            L&apos;envoi d&apos;un courriel de réinitialisation n&apos;est pas encore branché. Sur la démonstration, le mot de passe des comptes existants est Misterdil2026.
          </p>
        </div>
        <Link href="/connexion" className="mt-6 flex h-12 items-center justify-center rounded-xl bg-[#2f7cf6] text-sm font-medium text-white hover:bg-[#1d68e0]">
          Retour à la connexion
        </Link>
      </div>
    </AuthStage>
  );
}
