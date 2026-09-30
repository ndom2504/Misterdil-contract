import { approveParticipation, requestValidation, sendForSignature, signDocument } from "@/server/actions/collaboration";
import { failure, mobileUser, readJson, reply } from "@/server/mobile";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<{ action: string; signatureId: string }>(request);
  const action = typeof body.action === "string" ? body.action : "";
  const result =
    action === "request-validation"
      ? await requestValidation(id)
      : action === "approve"
        ? await approveParticipation(id)
        : action === "send-signature"
          ? await sendForSignature(id)
          : action === "sign"
            ? await signDocument(id, typeof body.signatureId === "string" ? body.signatureId : "")
            : null;
  if (!result) return failure("Action inconnue.");
  if (!result.ok) return failure(result.error);
  return reply({ ok: true });
}
