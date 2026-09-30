import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminLogin } from "@/components/admin-ui";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui";
import { adminReady, currentAdmin } from "@/server/admin-auth";

export const metadata = { title: "Connexion" };

export default async function AdminSignIn() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo />
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[#10233f] px-3 py-1 text-xs font-medium text-white">
            <ShieldCheck className="h-3.5 w-3.5" />
            Console d&apos;administration
          </p>
        </div>
        <Card className="p-6">
          <AdminLogin problem={adminReady()} />
        </Card>
        <p className="text-center text-xs text-[#8b939e]">Accès réservé. Les tentatives sont limitées et journalisées.</p>
      </div>
    </main>
  );
}
