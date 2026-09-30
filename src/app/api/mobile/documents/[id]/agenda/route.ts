import { createAgendaEvent, documentAgenda, setDueDate, type AgendaInput } from "@/server/agenda";
import { failure, mobileUser, readJson, reply } from "@/server/mobile";

type Context = { params: Promise<{ id: string }> };

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const agenda = await documentAgenda(user, id);
  if (!agenda) return failure("Entente inaccessible.", 404);
  return reply({ ok: true, ...agenda });
}

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<Record<keyof AgendaInput, unknown>>(request);
  const result = await createAgendaEvent(user, id, {
    kind: text(body.kind),
    title: text(body.title),
    notes: text(body.notes),
    location: text(body.location),
    day: text(body.day),
    time: text(body.time),
    endTime: text(body.endTime),
    online: body.online === true,
    outlook: body.outlook !== false,
  });
  if (!result.ok) return failure(result.error);
  return reply(result, 201);
}

// Changes the deadline of the agreement itself.
export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<{ dueDate: string }>(request);
  const result = await setDueDate(user, id, text(body.dueDate));
  if (!result.ok) return failure(result.error, 403);
  return reply(result);
}
