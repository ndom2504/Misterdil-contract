"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FolderOpen, HardDrive, LayoutDashboard, Lock, Mail, Send, Users } from "lucide-react";
import { signInAdmin, type AdminFormState } from "@/server/actions/admin";
import { Button, Field, controlClass } from "@/components/ui";
import { cn } from "@/lib/cn";

export function AdminLogin({ problem }: { problem: string }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(signInAdmin, {});
  return (
    <form action={action} className="space-y-4">
      {problem ? <p className="rounded-lg bg-[#fff4e5] px-3 py-2 text-sm text-[#8a4b00]">{problem}</p> : null}
      <Field label="Courriel administrateur">
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#98a0ab]" />
          <input name="email" type="email" autoComplete="username" required className={cn(controlClass, "pl-9")} />
        </div>
      </Field>
      <Field label="Mot de passe">
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#98a0ab]" />
          <input name="password" type="password" autoComplete="current-password" required className={cn(controlClass, "pl-9")} />
        </div>
      </Field>
      {state.error ? <p className="text-sm text-[#9f2d2d]">{state.error}</p> : null}
      <Button className="w-full" disabled={pending || Boolean(problem)}>
        {pending ? "Vérification…" : "Ouvrir la console"}
      </Button>
    </form>
  );
}

const LINKS = [
  { href: "/admin", label: "Tableau de bord", Icon: LayoutDashboard },
  { href: "/admin/utilisateurs", label: "Utilisateurs", Icon: Users },
  { href: "/admin/contenu", label: "Espaces et ententes", Icon: FolderOpen },
  { href: "/admin/invitations", label: "Invitations", Icon: Send },
  { href: "/admin/fichiers", label: "Fichiers", Icon: HardDrive },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col">
      {LINKS.map(({ href, label, Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
              active ? "bg-white/12 font-medium text-white" : "text-white/70 hover:bg-white/8 hover:text-white",
            )}>
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Submit({ label, danger }: { label: string; danger?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap disabled:opacity-50",
        danger ? "text-[#b42318] hover:bg-[#fdecec]" : "text-[#1e4ed8] hover:bg-[#eef3ff]",
      )}>
      {pending ? "…" : label}
    </button>
  );
}

// A one-button form around an admin server action, with a browser confirmation first.
export function AdminAction({
  action,
  id,
  back,
  label,
  confirm,
  danger,
  fields,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  back: string;
  label: string;
  confirm: string;
  danger?: boolean;
  fields?: Record<string, string>;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="back" value={back} />
      {Object.entries(fields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Submit label={label} danger={danger} />
    </form>
  );
}
