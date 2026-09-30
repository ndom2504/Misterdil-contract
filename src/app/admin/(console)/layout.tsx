import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { AdminNav } from "@/components/admin-ui";
import { signOutAdmin } from "@/server/actions/admin";
import { requireAdmin } from "@/server/admin-auth";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="lg:flex">
      <aside className="bg-[#10233f] px-4 py-4 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:py-6">
        <Link href="/admin" className="mb-4 flex items-center gap-2 px-3 font-semibold lg:mb-8">
          <ShieldCheck className="h-5 w-5 text-[#7aa2ff]" />
          Misterdil · Admin
        </Link>
        <AdminNav />
        <div className="mt-4 border-t border-white/10 px-3 pt-4 lg:mt-auto">
          <p className="truncate text-xs text-white/60">{admin.email}</p>
          <form action={signOutAdmin}>
            <button type="submit" className="mt-2 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl space-y-5">{children}</div>
      </main>
    </div>
  );
}
