import { AssistantPanel } from "@/components/assistant-panel";
import { Card } from "@/components/ui";
import { requireUser } from "@/server/current-user";
import { assistantHistory } from "@/server/queries";

export const metadata = { title: "Assistant Misterdil" };

export default async function AssistantPage() {
  const user = await requireUser();
  const history = await assistantHistory(user.id);
  const configured = Boolean(process.env.OPENAI_API_KEY?.trim());
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Assistant Misterdil</h1>
      <p className="mt-1 text-sm text-[#5e6875]">
        L&apos;assistant répond à partir des documents auxquels vous avez accès.
        {configured ? " Le modèle configuré est actif." : " Sans clé OpenAI, il s'appuie sur le contexte déjà enregistré."}
      </p>
      <Card className="mt-6 p-5">
        <AssistantPanel initial={history} />
      </Card>
    </div>
  );
}
