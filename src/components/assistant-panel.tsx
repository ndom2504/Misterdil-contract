"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { askAssistant } from "@/server/actions/assistant";
import { Button, controlClass } from "@/components/ui";

const PROMPTS = [
  "Qu'est-ce qui manque à mon contrat ?",
  "Résume les modifications.",
  "Quels points sont encore en discussion ?",
  "Explique cette clause.",
  "Prépare une synthèse pour le directeur.",
  "Identifie les incohérences dans le document.",
  "Propose une formulation plus claire.",
];

type Message = { role: string; content: string };

export function AssistantPanel({
  documentId,
  initial = [],
  compact = false,
}: {
  documentId?: string;
  initial?: Message[];
  compact?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function send(value: string) {
    const content = value.trim();
    if (!content) return;
    setText("");
    setError("");
    startTransition(async () => {
      const result = await askAssistant(content, documentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessages((current) => [
        ...current,
        { role: "user", content },
        { role: "assistant", content: result.answer },
      ]);
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className={compact ? "min-h-48 flex-1 space-y-3 overflow-y-auto" : "min-h-80 flex-1 space-y-3"}>
        {messages.length === 0 ? (
          <div className="rounded-lg bg-[#f7f8fb] px-3 py-3 text-sm leading-6 text-[#5e6875]">
            Misterdil AI propose. Le modérateur décide. Les parties valident.
          </div>
        ) : null}
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-6 rounded-lg bg-[#eef3ff] px-3 py-2.5 text-sm leading-6" : "rounded-lg border border-[#e6e8ee] px-3 py-2.5 text-sm leading-6"}>
            <p className="mb-1 text-xs font-medium text-[#5e6875]">{message.role === "user" ? "Vous" : "Misterdil AI"}</p>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PROMPTS.slice(0, compact ? 3 : 7).map((prompt) => (
          <button key={prompt} type="button" onClick={() => send(prompt)} className="rounded-full border border-[#e6e8ee] px-2.5 py-1 text-left text-xs text-[#3f4854] hover:bg-[#f7f8fb]">
            {prompt}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          send(text);
        }}
      >
        <input className={controlClass} value={text} onChange={(event) => setText(event.target.value)} placeholder="Demander à Misterdil AI" />
        <Button type="submit" disabled={pending}>
          <Sparkles className="h-4 w-4" />
          {pending ? "..." : "Envoyer"}
        </Button>
      </form>
      {error ? <p className="mt-2 text-sm text-[#9f2d2d]">{error}</p> : null}
    </div>
  );
}
