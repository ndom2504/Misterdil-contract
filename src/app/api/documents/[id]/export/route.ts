import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/current-user";
import { buildDocx } from "@/server/export-docx";
import { buildPdf } from "@/server/export-pdf";
import { loadDocumentForUser } from "@/server/guard";
import { slugify } from "@/server/slug";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const loaded = await loadDocumentForUser(id, user);
  if (!loaded) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });

  const document = loaded.document;
  const payload = {
    title: document.title,
    typeLabel: document.type.label,
    status: document.status,
    moderator: document.moderator?.name ?? "Non désigné",
    sections: [...document.sections]
      .sort((a, b) => a.position - b.position)
      .map((section) => ({ title: section.title, content: section.content })),
    parties: document.stakeholders.map((party) => ({
      name: party.name,
      organization: party.organization,
      partyType: party.partyType,
      email: party.email,
    })),
  };

  const format = new URL(request.url).searchParams.get("format");
  const filename = slugify(document.title);

  if (format === "docx") {
    const buffer = await buildDocx(payload);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}.docx"`,
      },
    });
  }

  const pdf = await buildPdf(payload);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    },
  });
}
