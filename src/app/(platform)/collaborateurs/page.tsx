import Link from "next/link";
import { Card } from "@/components/ui";
import { roleLabel } from "@/lib/domain";
import { initials } from "@/lib/format";
import { requireUser } from "@/server/current-user";
import { listCollaborators } from "@/server/queries";

export const metadata = { title: "Collaborateurs" };

export default async function PeoplePage() {
  const user = await requireUser();
  const people = await listCollaborators(user);
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Collaborateurs</h1>
      <p className="mt-1 text-sm text-[#5e6875]">Les personnes qui partagent un espace avec vous.</p>
      <div className="mt-6 space-y-3">
        {people.map((person) => (
          <Card key={person.id} className="flex gap-4 px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef3ff] text-sm font-semibold text-[#1e4ed8]">{initials(person.name)}</span>
            <div>
              <p className="font-medium">{person.name}{person.id === user.id ? " · vous" : ""}</p>
              <p className="text-sm text-[#5e6875]">{person.jobTitle}{person.organization ? ` · ${person.organization}` : ""}</p>
              <p className="text-sm text-[#8b939e]">{person.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {person.workspaces.map((workspace) => (
                  <Link key={workspace.id} href={`/espaces/${workspace.id}`} className="rounded-full bg-[#f4f6f8] px-2.5 py-1 text-xs text-[#3f4854]">
                    {workspace.name} · {roleLabel(workspace.role)}
                  </Link>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
