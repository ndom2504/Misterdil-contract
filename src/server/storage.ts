import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { get, put } from "@vercel/blob";

const BLOB_PREFIX = "blob:";
const LOCAL_DIRECTORY = path.join(process.cwd(), "data", "uploads");

// On Vercel, a linked store only exposes BLOB_STORE_ID; the SDK then authenticates with
// the runtime OIDC token. Locally, that token only exists after `vercel env pull`.
export function blobConfigured() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  return Boolean(process.env.BLOB_STORE_ID && (process.env.VERCEL || process.env.VERCEL_OIDC_TOKEN));
}

export async function storeFile(extension: string, bytes: Buffer, contentType: string) {
  const name = `${crypto.randomUUID()}.${extension}`;
  if (blobConfigured()) {
    const blob = await put(`attachments/${name}`, bytes, { access: "private", contentType, addRandomSuffix: false });
    return `${BLOB_PREFIX}${blob.pathname}`;
  }
  if (process.env.VERCEL) throw new Error("Aucun store Vercel Blob n'est relié au projet.");
  await mkdir(LOCAL_DIRECTORY, { recursive: true });
  await writeFile(path.join(LOCAL_DIRECTORY, name), bytes);
  return name;
}

export async function openFile(storagePath: string): Promise<BodyInit | null> {
  if (storagePath.startsWith(BLOB_PREFIX)) {
    const result = await get(storagePath.slice(BLOB_PREFIX.length), { access: "private" });
    return result?.statusCode === 200 ? result.stream : null;
  }
  try {
    return new Uint8Array(await readFile(path.join(LOCAL_DIRECTORY, path.basename(storagePath))));
  } catch {
    return null;
  }
}
