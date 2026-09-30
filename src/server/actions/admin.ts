"use server";

import { redirect } from "next/navigation";
import { cancelInvitation, deleteUserAccount, setUserDisabled } from "@/server/admin";
import { adminSignIn, adminSignOut, requireAdmin } from "@/server/admin-auth";
import { ADMINISTRATION, removeDocument, removeWorkspace } from "@/server/deletion";

export type AdminFormState = { error?: string };

export async function signInAdmin(_state: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const result = await adminSignIn(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
  if (!result.ok) return { error: result.error };
  redirect("/admin");
}

export async function signOutAdmin() {
  await adminSignOut();
  redirect("/admin/connexion");
}

// Every action returns to the page it came from, with a short notice in the query string.
function back(formData: FormData, notice: string, failed = false): never {
  const raw = String(formData.get("back") ?? "/admin");
  const url = new URL(raw.startsWith("/admin") ? raw : "/admin", "http://admin.local");
  url.searchParams.delete("ok");
  url.searchParams.delete("erreur");
  url.searchParams.set(failed ? "erreur" : "ok", notice);
  redirect(`${url.pathname}${url.search}`);
}

function target(formData: FormData) {
  return String(formData.get("id") ?? "");
}

export async function toggleUserAction(formData: FormData) {
  await requireAdmin();
  const disable = formData.get("disable") === "1";
  const result = await setUserDisabled(target(formData), disable);
  if (!result.ok) back(formData, result.error, true);
  back(formData, disable ? "Compte désactivé : ses sessions sont fermées." : "Compte réactivé.");
}

export async function deleteUserAction(formData: FormData) {
  await requireAdmin();
  const result = await deleteUserAccount(target(formData));
  if (!result.ok) back(formData, result.error, true);
  back(
    formData,
    result.anonymized
      ? "Compte anonymisé : ses ententes et documents restent disponibles pour les autres parties."
      : "Compte supprimé.",
  );
}

export async function deleteWorkspaceAction(formData: FormData) {
  await requireAdmin();
  const result = await removeWorkspace(target(formData), ADMINISTRATION);
  if (!result.ok) back(formData, result.error, true);
  back(formData, "Espace supprimé avec ses ententes et ses fichiers.");
}

export async function deleteDocumentAction(formData: FormData) {
  await requireAdmin();
  const result = await removeDocument(target(formData), ADMINISTRATION);
  if (!result.ok) back(formData, result.error, true);
  back(formData, "Entente supprimée.");
}

export async function cancelInvitationAction(formData: FormData) {
  await requireAdmin();
  const result = await cancelInvitation(target(formData));
  if (!result.ok) back(formData, result.error, true);
  back(formData, "Invitation annulée : son lien ne fonctionne plus.");
}
