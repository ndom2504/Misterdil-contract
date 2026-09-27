import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold tracking-[0.14em]">MISTERDIL</p>
      <h1 className="mt-4 text-3xl font-semibold">Page introuvable</h1>
      <p className="mt-2 max-w-md text-[#5e6875]">Ce document n&apos;existe pas ou vous n&apos;y avez pas été invité.</p>
      <Link href="/accueil" className="mt-6 rounded-lg bg-[#1e4ed8] px-4 py-2.5 text-sm font-medium text-white">Retour à l&apos;accueil</Link>
    </div>
  );
}
