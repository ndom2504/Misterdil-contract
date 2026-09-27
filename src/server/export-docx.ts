import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { documentStatusLabel, partyLabel } from "@/lib/domain";

export async function buildDocx(input: {
  title: string;
  typeLabel: string;
  status: string;
  moderator: string;
  sections: { title: string; content: string }[];
  parties: { name: string; organization: string; partyType: string; email: string }[];
}) {
  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: "MISTERDIL", bold: true, color: "1E4ED8", size: 18 })],
    }),
    new Paragraph({ text: input.title, heading: HeadingLevel.TITLE }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${input.typeLabel} · ${documentStatusLabel(input.status)} · Modérateur : ${input.moderator}`,
          italics: true,
          color: "5E6875",
        }),
      ],
    }),
  ];

  input.sections.forEach((section, index) => {
    children.push(new Paragraph({ text: `${index + 1}. ${section.title}`, heading: HeadingLevel.HEADING_1 }));
    for (const paragraph of section.content.split(/\n{2,}/)) {
      const value = paragraph.trim();
      if (!value) continue;
      children.push(new Paragraph({ children: [new TextRun(value)] }));
    }
  });

  children.push(new Paragraph({ text: "Signatures", heading: HeadingLevel.HEADING_1 }));
  for (const party of input.parties) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${party.organization || party.name} — ${partyLabel(party.partyType)}`, bold: true }),
        ],
      }),
      new Paragraph({ text: party.email || party.name }),
      new Paragraph({ text: "Signature : ________________________________" }),
    );
  }

  const document = new Document({
    sections: [{ children }],
  });
  return Packer.toBuffer(document);
}
