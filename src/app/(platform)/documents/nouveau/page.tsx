import { notFound, redirect } from "next/navigation";
import { AgreementWizard } from "@/components/wizard";
import { DOCUMENT_TYPES, SECTORS } from "@/lib/catalog";
import { requireUser } from "@/server/current-user";
import { getDocumentView, listWorkspaces } from "@/server/queries";

export const metadata = { title: "Nouvelle entente" };

export default async function NewAgreementPage({ searchParams }: { searchParams: Promise<{ brouillon?: string }> }) {
  const user = await requireUser();
  const { brouillon } = await searchParams;
  const workspaces = (await listWorkspaces(user)).filter((workspace) =>
    ["ADMINISTRATOR", "CREATOR", "MODERATOR"].includes(workspace.role),
  );
  const draft = brouillon ? await getDocumentView(user, brouillon) : null;
  if (brouillon && !draft) notFound();
  if (draft && !draft.access.canEdit) redirect(`/documents/${draft.id}`);

  return (
    <AgreementWizard
      key={draft?.id ?? "nouveau"}
      workspaces={workspaces.map((workspace) => ({ id: workspace.id, name: workspace.name }))}
      types={DOCUMENT_TYPES.map((type) => ({ id: type.id, label: type.label, description: type.description }))}
      sectors={SECTORS}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        organization: user.organization?.name ?? "",
        jobTitle: user.jobTitle,
        phone: user.organization?.phone || user.phone,
        address: user.organization?.address ?? "",
        individual: user.organization?.kind === "INDIVIDUAL",
      }}
      draft={draft ? {
        id: draft.id,
        title: draft.title,
        typeId: draft.typeId,
        typeLabel: draft.typeLabel,
        sector: draft.sector,
        domain: draft.domain,
        description: draft.description,
        brief: draft.brief?.objectif && draft.brief.client && draft.brief.prestataire && draft.brief.duree
          ? {
              objectif: draft.brief.objectif,
              client: draft.brief.client,
              prestataire: draft.brief.prestataire,
              duree: draft.brief.duree,
            }
          : null,
        responses: draft.responses,
        hasContent: draft.sections.some((section) => section.anchor !== "parties" && section.content.trim().length > 0),
      } : null}
    />
  );
}
