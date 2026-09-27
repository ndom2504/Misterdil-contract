import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { documentStatusLabel, partyLabel } from "@/lib/domain";

type ExportSection = { title: string; content: string };
type ExportParty = { name: string; organization: string; partyType: string; email: string };

function safe(value: string) {
  return value
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"')
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ");
}

export async function buildPdf(input: {
  title: string;
  typeLabel: string;
  status: string;
  moderator: string;
  sections: ExportSection[];
  parties: ExportParty[];
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const width = 595.28;
  const height = 841.89;
  const margin = 56;
  const pages: ReturnType<PDFDocument["addPage"]>[] = [];

  const addPage = () => {
    const page = pdf.addPage([width, height]);
    pages.push(page);
    page.drawRectangle({ x: 0, y: height - 28, width, height: 28, color: rgb(0.12, 0.31, 0.85) });
    page.drawText("MISTERDIL", { x: margin, y: height - 18, size: 9, font: bold, color: rgb(1, 1, 1) });
    return { page, cursor: height - 56 };
  };

  let current = addPage();

  const ensure = (needed: number) => {
    if (current.cursor - needed < 48) current = addPage();
  };

  const write = (text: string, size: number, font: typeof regular, color = rgb(0.07, 0.09, 0.12), gap = 4) => {
    const words = safe(text).split(/\s+/).filter(Boolean);
    let line = "";
    const max = width - margin * 2;
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > max) {
        ensure(size + gap);
        current.page.drawText(line, { x: margin, y: current.cursor, size, font, color });
        current.cursor -= size + gap;
        line = word;
      } else {
        line = next;
      }
    }
    if (line) {
      ensure(size + gap);
      current.page.drawText(line, { x: margin, y: current.cursor, size, font, color });
      current.cursor -= size + gap;
    }
  };

  write(input.title, 18, bold, rgb(0.07, 0.09, 0.12), 8);
  write(`${input.typeLabel}  ·  ${documentStatusLabel(input.status)}  ·  Modérateur : ${input.moderator}`, 10, regular, rgb(0.35, 0.4, 0.46), 16);

  input.sections.forEach((section, index) => {
    write(`${index + 1}. ${section.title}`, 13, bold, rgb(0.12, 0.31, 0.85), 8);
    for (const paragraph of section.content.split(/\n{2,}/)) {
      const value = paragraph.trim();
      if (!value) continue;
      write(value.replace(/\n/g, " "), 11, regular, rgb(0.1, 0.12, 0.16), 4);
      current.cursor -= 6;
    }
    current.cursor -= 8;
  });

  write("Signatures", 13, bold, rgb(0.12, 0.31, 0.85), 10);
  if (!input.parties.length) write("Les signataires seront désignés avant l'envoi.", 11, regular);
  for (const party of input.parties) {
    write(`${party.organization || party.name} — ${partyLabel(party.partyType)}`, 11, bold, rgb(0.1, 0.12, 0.16), 4);
    write(party.email || party.name, 10, regular, rgb(0.35, 0.4, 0.46), 4);
    current.cursor -= 18;
    ensure(12);
    current.page.drawLine({
      start: { x: margin, y: current.cursor },
      end: { x: margin + 220, y: current.cursor },
      thickness: 0.6,
      color: rgb(0.7, 0.73, 0.78),
    });
    current.cursor -= 16;
  }

  pages.forEach((page, index) => {
    page.drawText(`Document confidentiel  ·  Page ${index + 1} / ${pages.length}`, {
      x: margin,
      y: 28,
      size: 9,
      font: regular,
      color: rgb(0.45, 0.49, 0.55),
    });
  });

  return pdf.save();
}
