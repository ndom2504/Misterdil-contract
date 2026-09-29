import { notFound, redirect } from "next/navigation";
import { DocumentWorkspace } from "@/components/document-workspace";
import { requireUser } from "@/server/current-user";
import { assistantHistory, getDocumentView } from "@/server/queries";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const view = await getDocumentView(user, id);
  return { title: view?.title ?? "Document" };
}

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const user = await requireUser();
  const view = await getDocumentView(user, id);
  if (!view) notFound();
  if (view.sections.length === 0 && view.access.canEdit) redirect(`/documents/nouveau?brouillon=${id}`);
  const history = await assistantHistory(user.id, id);
  return <DocumentWorkspace view={view} initialTab={onglet ?? "document"} history={history} />;
}
