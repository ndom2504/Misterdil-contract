import { Card } from "@/components/ui";
import { PageHead, Stat, Table, bytes } from "@/components/admin-parts";
import { formatDate } from "@/lib/format";
import { adminStorage } from "@/server/admin";
import { requireAdmin } from "@/server/admin-auth";

export const metadata = { title: "Fichiers" };

const FOLDERS: Record<string, string> = {
  attachments: "Pièces jointes",
  chat: "Fichiers des discussions",
  avatars: "Photos de profil",
};

export default async function AdminFiles() {
  await requireAdmin();
  const storage = await adminStorage();
  const blobTotal = storage.blob?.folders.reduce((sum, item) => sum + item.size, 0) ?? 0;
  const blobCount = storage.blob?.folders.reduce((sum, item) => sum + item.count, 0) ?? 0;

  return (
    <>
      <PageHead title="Fichiers" text="Espace utilisé et fichiers les plus volumineux. Le contenu des fichiers n'est pas accessible depuis la console." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Stockage Vercel Blob" value={storage.blob ? bytes(blobTotal) : "—"} hint={storage.blob ? `${blobCount} fichier${blobCount > 1 ? "s" : ""}${storage.blob.partial ? " (lecture partielle)" : ""}` : "Stockage local (développement)"} />
        <Stat label="Pièces jointes" value={bytes(storage.attachments.size)} hint={`${storage.attachments.count} fichier${storage.attachments.count > 1 ? "s" : ""}`} />
        <Stat label="Fichiers des discussions" value={bytes(storage.chat.size)} hint={`${storage.chat.count} fichier${storage.chat.count > 1 ? "s" : ""}`} />
        <Stat label="Photos de profil" value={storage.avatars} />
      </div>

      {storage.blob ? (
        <Card className="p-5">
          <h2 className="font-semibold text-[#10233f]">Répartition du stockage</h2>
          {storage.blob.error ? <p className="mt-2 text-sm text-[#9f2d2d]">{storage.blob.error}</p> : null}
          <ul className="mt-3 space-y-3 text-sm">
            {storage.blob.folders.map((folder) => (
              <li key={folder.name}>
                <div className="flex justify-between gap-3">
                  <span className="text-[#3f4854]">{FOLDERS[folder.name] ?? folder.name}</span>
                  <span className="text-[#10233f]">
                    {bytes(folder.size)} <span className="text-xs text-[#8b939e]">· {folder.count} fichier{folder.count > 1 ? "s" : ""}</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[#eef0f3]">
                  <div className="h-1.5 rounded-full bg-[#1e4ed8]" style={{ width: `${blobTotal ? Math.max(1, (folder.size / blobTotal) * 100) : 0}%` }} />
                </div>
              </li>
            ))}
            {!storage.blob.error && storage.blob.folders.length === 0 ? <li className="text-[#8b939e]">Le stockage est vide.</li> : null}
          </ul>
        </Card>
      ) : null}

      <div>
        <h2 className="mb-3 font-semibold text-[#10233f]">Fichiers les plus volumineux</h2>
        <Table head={["Fichier", "Type", "Entente ou espace", "Déposé par", "Date", "Taille"]} empty={storage.largest.length === 0}>
          {storage.largest.map((file) => (
            <tr key={`${file.kind}-${file.id}`}>
              <td className="max-w-72 truncate px-4 py-3 font-medium text-[#10233f]">{file.name}</td>
              <td className="px-4 py-3">{file.kind}</td>
              <td className="px-4 py-3">{file.place}</td>
              <td className="px-4 py-3">{file.owner}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatDate(file.createdAt)}</td>
              <td className="px-4 py-3 whitespace-nowrap">{bytes(file.size)}</td>
            </tr>
          ))}
        </Table>
      </div>
    </>
  );
}
