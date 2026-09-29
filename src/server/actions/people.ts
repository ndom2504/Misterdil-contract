"use server";

import { prisma } from "@/server/db";
import { requireUser } from "@/server/current-user";

export type PersonMatch = {
  id: string;
  name: string;
  email: string;
  organization: string;
  jobTitle: string;
  phone: string;
  inNetwork: boolean;
};

function fold(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Name search is limited to people who already share a workspace with the user;
// anyone else can only be found by typing their exact email.
export async function searchPeople(query: string): Promise<PersonMatch[]> {
  const user = await requireUser();
  const text = query.trim();
  if (text.length < 2) return [];

  const spaces = await prisma.workspaceMember.findMany({ where: { userId: user.id }, select: { workspaceId: true } });
  const network = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      memberships: { some: { workspaceId: { in: spaces.map((space) => space.workspaceId) } } },
    },
    include: { organization: true },
    take: 500,
  });

  const needle = fold(text);
  const matches: PersonMatch[] = network
    .filter((person) => fold(`${person.name} ${person.email} ${person.organization?.name ?? ""}`).includes(needle))
    .slice(0, 8)
    .map((person) => ({
      id: person.id,
      name: person.name,
      email: person.email,
      organization: person.organization?.name ?? "",
      jobTitle: person.jobTitle ?? "",
      phone: person.phone ?? "",
      inNetwork: true,
    }));

  const email = text.toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email !== user.email && !matches.some((person) => person.email === email)) {
    const exact = await prisma.user.findUnique({ where: { email }, include: { organization: true } });
    if (exact) {
      matches.unshift({
        id: exact.id,
        name: exact.name,
        email: exact.email,
        organization: exact.organization?.name ?? "",
        jobTitle: exact.jobTitle ?? "",
        phone: "",
        inNetwork: false,
      });
    }
  }
  return matches;
}
