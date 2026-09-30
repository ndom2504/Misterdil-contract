export type UploadTarget = { purpose: "avatar" | "chat"; documentId?: string };

// Vercel refuses request bodies above 4.5 MB; below that a regular form upload still works
// if the browser cannot reach Blob storage directly.
const FORM_LIMIT = 4 * 1024 * 1024;

type Prepared = { mode: "direct"; url: string; pathname: string } | { mode: "form" } | { error?: string };

async function errorOf(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

// Returns the stored pathname, or null when the file should travel in a form upload instead.
export async function uploadDirect(file: Blob, name: string, target: UploadTarget): Promise<string | null> {
  const response = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose: target.purpose, documentId: target.documentId, name, size: file.size }),
  });
  if (!response.ok) throw new Error(await errorOf(response, "L'envoi n'a pas pu être préparé."));
  const prepared = (await response.json()) as Prepared;
  if (!("mode" in prepared) || prepared.mode === "form") return null;

  const sent = await fetch(prepared.url, { method: "PUT", body: file }).catch(() => null);
  if (sent?.ok) return prepared.pathname;
  if (!sent && file.size <= FORM_LIMIT) return null;
  throw new Error("L'envoi du fichier a échoué. Vérifiez votre connexion et réessayez.");
}

// Profile photos are shown small: a 768 px JPEG keeps them light and always under the limit.
export async function shrinkImage(file: File, size = 768): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("canvas");
  return blob;
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
