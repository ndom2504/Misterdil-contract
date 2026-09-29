import { ROLE_PERMISSIONS } from "@/lib/domain";

export type Access = {
  workspaceRole: string;
  documentRole: string;
  canRead: boolean;
  canEdit: boolean;
  canWrite: boolean;
  canComment: boolean;
  canPropose: boolean;
  canValidate: boolean;
  canLock: boolean;
  canInvite: boolean;
  canManageWorkspace: boolean;
  isModerator: boolean;
};

const BROAD = new Set(["ADMINISTRATOR", "CREATOR", "MODERATOR"]);

export function can(role: string, permission: string) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// canEdit covers the structure (title, assistant pre-fill); canWrite covers the text of
// the sections, which every participant writes together once the agreement is sent.
export function resolveAccess(input: {
  workspaceRole: string | null;
  stakeholderRole?: string | null;
  isStakeholder: boolean;
  isDocumentModerator: boolean;
  sent?: boolean;
}): Access | null {
  if (!input.workspaceRole) return null;

  const isModerator =
    input.isDocumentModerator ||
    input.workspaceRole === "ADMINISTRATOR" ||
    input.workspaceRole === "CREATOR" ||
    input.workspaceRole === "MODERATOR";

  const canRead = isModerator || (input.isStakeholder && input.sent !== false);
  if (!canRead) return null;

  let documentRole = input.workspaceRole;
  if (!BROAD.has(input.workspaceRole) && input.stakeholderRole) {
    documentRole = input.stakeholderRole;
  }

  return {
    workspaceRole: input.workspaceRole,
    documentRole,
    canRead: true,
    canEdit: isModerator,
    canWrite: isModerator || documentRole === "PARTICIPANT",
    canComment: isModerator || can(documentRole, "document.comment"),
    canPropose: isModerator || can(documentRole, "document.propose"),
    canValidate: isModerator,
    canLock: isModerator,
    canInvite: isModerator,
    canManageWorkspace: can(input.workspaceRole, "workspace.manage"),
    isModerator,
  };
}
