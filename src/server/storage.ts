import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { del, get, head, issueSignedToken, presignUrl, put } from "@vercel/blob";

const BLOB_PREFIX = "blob:";
const LOCAL_DIRECTORY = path.join(process.cwd(), "data", "uploads");
const DIRECT_UPLOAD_MINUTES = 15;

// On Vercel, a linked store only exposes BLOB_STORE_ID; the SDK then authenticates with
// the runtime OIDC token. Locally, that token only exists after `vercel env pull`.
export function blobConfigured() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  return Boolean(process.env.BLOB_STORE_ID && (process.env.VERCEL || process.env.VERCEL_OIDC_TOKEN));
}

export async function storeFile(extension: string, bytes: Buffer, contentType: string, folder = "attachments") {
  const name = `${crypto.randomUUID()}.${extension}`;
  if (blobConfigured()) {
    const blob = await put(`${folder}/${name}`, bytes, { access: "private", contentType, addRandomSuffix: false });
    return `${BLOB_PREFIX}${blob.pathname}`;
  }
  if (process.env.VERCEL) throw new Error("Aucun store Vercel Blob n'est relié au projet.");
  await mkdir(LOCAL_DIRECTORY, { recursive: true });
  await writeFile(path.join(LOCAL_DIRECTORY, name), bytes);
  return name;
}

// Vercel refuses request bodies above 4.5 MB, so large files go straight from the client to
// Blob with a single-use signed URL scoped to one pathname and a maximum size.
export async function directUploadUrl(pathname: string, maximumSizeInBytes: number) {
  const validUntil = Date.now() + DIRECT_UPLOAD_MINUTES * 60 * 1000;
  const signed = await issueSignedToken({ pathname, operations: ["put"], maximumSizeInBytes, validUntil });
  const { presignedUrl } = await presignUrl(signed, {
    operation: "put",
    pathname,
    access: "private",
    maximumSizeInBytes,
    validUntil,
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  return presignedUrl;
}

export async function uploadedSize(pathname: string) {
  try {
    return (await head(pathname)).size;
  } catch {
    return null;
  }
}

export function blobPath(pathname: string) {
  return `${BLOB_PREFIX}${pathname}`;
}

export async function removeFile(storagePath: string) {
  if (!storagePath) return;
  try {
    if (storagePath.startsWith(BLOB_PREFIX)) await del(storagePath.slice(BLOB_PREFIX.length));
    else await unlink(path.join(LOCAL_DIRECTORY, path.basename(storagePath)));
  } catch (error) {
    console.error("[stockage]", error instanceof Error ? error.message : error);
  }
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
