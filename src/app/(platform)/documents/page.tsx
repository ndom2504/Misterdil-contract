import Link from "next/link";
import { DocumentTable } from "@/components/document-table";
import { Card } from "@/components/ui";
import { requireUser } from "@/server/current-user";
import { listDocuments } from "@/server/queries";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const user = await requireUser();
  const documents = await listDocuments(user);
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-[#5e6875]">Toutes les ententes auxquelles vous participez.</p>
        </div>
        <Link href="/documents/nouveau" className="rounded-lg bg-[#1e4ed8] px-3.5 py-2.5 text-sm font-medium text-white">+ Nouvelle entente</Link>
      </div>
      <Card><DocumentTable documents={documents} /></Card>
    </div>
  );
}
