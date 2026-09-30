import type { SessionUser } from "@/server/current-user";
import { documentAccess } from "@/server/guard";
import { blobConfigured, blobPath, directUploadUrl, removeFile, storeFile, uploadedSize } from "@/server/storage";

const IMAGES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

const RULES = {
  avatar: { folder: "avatars", max: 10 * 1024 * 1024, types: IMAGES, label: "une image JPG, PNG ou WebP" },
  chat: {
    folder: "chat",
    max: 25 * 1024 * 1024,
    types: {
      ...IMAGES,
      gif: "image/gif",
      heic: "image/heic",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      txt: "text/plain",
      csv: "text/csv",
      zip: "application/zip",
    } as Record<string, string>,
    label: "une image, un PDF, un document Office, un fichier texte ou une archive ZIP",
  },
} as const;

export type UploadPurpose = keyof typeof RULES;
export type StoredUpload = { storagePath: string; name: string; mimeType: string; size: number };
type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

export function isUploadPurpose(value: unknown): value is UploadPurpose {
  return value === "avatar" || value === "chat";
}

function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function cleanFileName(name: string) {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").trim().slice(0, 160) || "fichier";
}

function megabytes(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} Mo`;
}

function check(purpose: UploadPurpose, name: string, size: number): Result<{ extension: string; mimeType: string }> {
  const rule = RULES[purpose];
  const extension = extensionOf(name);
  const mimeType = rule.types[extension];
  if (!mimeType) return { ok: false, error: `Choisissez ${rule.label}.` };
  if (size > rule.max) return { ok: false, error: `Le fichier dépasse ${megabytes(rule.max)}.` };
  return { ok: true, extension, mimeType };
}

function prefix(purpose: UploadPurpose, user: SessionUser, documentId: string) {
  return purpose === "chat" ? `chat/${documentId}/${user.id}/` : `avatars/${user.id}/`;
}

async function allowed(purpose: UploadPurpose, user: SessionUser, documentId: string) {
  if (purpose === "avatar") return true;
  return Boolean(documentId && (await documentAccess(documentId, user)));
}

// "form" tells the client to send the file in the request itself (local development without Blob).
export async function prepareUpload(
  user: SessionUser,
  input: { purpose: UploadPurpose; name: string; size: number; documentId?: string },
): Promise<Result<{ mode: "direct"; url: string; pathname: string } | { mode: "form" }>> {
  const documentId = input.documentId ?? "";
  if (!(await allowed(input.purpose, user, documentId))) return { ok: false, error: "Envoi non autorisé." };
  const checked = check(input.purpose, input.name, input.size);
  if (!checked.ok) return checked;
  if (!blobConfigured()) return { ok: true, mode: "form" };

  const pathname = `${prefix(input.purpose, user, documentId)}${crypto.randomUUID()}.${checked.extension}`;
  try {
    return { ok: true, mode: "direct", url: await directUploadUrl(pathname, RULES[input.purpose].max), pathname };
  } catch (error) {
    console.error("[televersement]", error instanceof Error ? error.message : error);
    return { ok: false, error: "L'envoi n'a pas pu être préparé. Réessayez." };
  }
}

// The client only ever receives signed URLs under its own prefix, so a pathname outside it
// was not uploaded by this user. The size is re-checked on the stored object.
export async function claimUpload(
  user: SessionUser,
  input: { purpose: UploadPurpose; pathname: string; name: string; documentId?: string },
): Promise<Result<StoredUpload>> {
  const documentId = input.documentId ?? "";
  const expected = prefix(input.purpose, user, documentId);
  if (!input.pathname.startsWith(expected) || input.pathname.includes("..")) return { ok: false, error: "Fichier introuvable." };
  if (!(await allowed(input.purpose, user, documentId))) return { ok: false, error: "Envoi non autorisé." };

  const name = cleanFileName(input.name);
  const size = await uploadedSize(input.pathname);
  if (size === null) return { ok: false, error: "Le fichier n'a pas été reçu. Réessayez." };
  const checked = check(input.purpose, input.pathname, size);
  if (!checked.ok) {
    await removeFile(blobPath(input.pathname));
    return checked;
  }
  return { ok: true, storagePath: blobPath(input.pathname), name, mimeType: checked.mimeType, size };
}

export async function storeFormFile(
  user: SessionUser,
  purpose: UploadPurpose,
  file: File,
  documentId = "",
): Promise<Result<StoredUpload>> {
  if (!(await allowed(purpose, user, documentId))) return { ok: false, error: "Envoi non autorisé." };
  const name = cleanFileName(file.name);
  const checked = check(purpose, name, file.size);
  if (!checked.ok) return checked;
  try {
    const folder = purpose === "chat" ? `chat/${documentId}` : RULES[purpose].folder;
    const storagePath = await storeFile(checked.extension, Buffer.from(await file.arrayBuffer()), checked.mimeType, folder);
    return { ok: true, storagePath, name, mimeType: checked.mimeType, size: file.size };
  } catch (error) {
    console.error("[televersement]", error instanceof Error ? error.message : error);
    return { ok: false, error: "Le fichier n'a pas pu être enregistré. Réessayez." };
  }
}
