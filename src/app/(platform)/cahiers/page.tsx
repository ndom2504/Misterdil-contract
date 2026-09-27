import { DocumentTable } from "@/components/document-table";
import { Card } from "@/components/ui";
import { requireUser } from "@/server/current-user";
import { listDocuments } from "@/server/queries";

export const metadata = { title: "Cahiers des charges" };

export default async function SpecsPage() {
  const user = await requireUser();
  const documents = (await listDocuments(user)).filter((document) => document.typeId === "cahier-des-charges");
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Cahiers des charges</h1>
      <p className="mt-1 text-sm text-[#5e6875]">Les besoins, le périmètre et les critères d&apos;acceptation liés à vos espaces.</p>
      <Card className="mt-6"><DocumentTable documents={documents} /></Card>
    </div>
  );
}
