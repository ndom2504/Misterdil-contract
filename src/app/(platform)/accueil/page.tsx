import Image from "next/image";
import Link from "next/link";
import { Calendar, CheckCircle2, FileText, MessageSquare, PenLine, Sparkles } from "lucide-react";
import { AssistantPanel } from "@/components/assistant-panel";
import { DeadlineBadge } from "@/components/deadline-badge";
import { DocumentTable } from "@/components/document-table";
import { addDays, dayLabel, zoneDay } from "@/lib/agenda";
import { userAgenda } from "@/server/agenda";
import { MicrosoftWindows } from "@/components/microsoft-windows";
import { ProgressBar } from "@/components/progress-bar";
import { requireUser } from "@/server/current-user";
import { getMicrosoftBoard } from "@/server/microsoft";
import { getDashboard, listWorkspaces, type DocumentSummary } from "@/server/queries";

export const metadata = { title: "Accueil" };

const kpis = [
  { key: "active", label: "Documents actifs", icon: FileText, tint: "bg-[#e8f0ff] text-[#2f6fed]" },
  { key: "discussion", label: "En discussion", icon: MessageSquare, tint: "bg-[#fff4e5] text-[#e07a12]" },
  { key: "validation", label: "À valider", icon: CheckCircle2, tint: "bg-[#e7f8ee] text-[#14804a]" },
  { key: "signature", label: "À signer", icon: PenLine, tint: "bg-[#f3eaff] text-[#7a3ff2]" },
  { key: "final", label: "Finalisés", icon: FileText, tint: "bg-[#e8f8ef] text-[#0f9f6e]" },
] as const;

function spaceImage(sector: string) {
  const value = sector.toLowerCase();
  if (value.includes("sant")) return "/brand/sectors/sante.jpg";
  if (value.includes("construct")) return "/brand/sectors/construction.jpg";
  if (value.includes("transport") || value.includes("logist")) return "/brand/sectors/transport.jpg";
  if (value.includes("financ")) return "/brand/sectors/finance.jpg";
  if (value.includes("commerc")) return "/brand/sectors/commerce.jpg";
  if (value.includes("industr")) return "/brand/sectors/industrie.jpg";
  if (value.includes("admin") || value.includes("public")) return "/brand/sectors/administration.jpg";
  if (value.includes("éduc") || value.includes("educ")) return "/brand/sectors/education.jpg";
  if (value.includes("service") || value.includes("conseil")) return "/brand/sectors/services.jpg";
  return "/brand/sectors/technologie.jpg";
}

function tasksFor(documents: DocumentSummary[]) {
  return documents
    .filter((document) => document.status !== "FINAL")
    .slice(0, 4)
    .map((document) => ({
      id: document.id,
      title:
        document.status === "PENDING_SIGNATURE"
          ? "Envoyer pour signature"
          : document.status === "PENDING_VALIDATION"
            ? "Demander la validation"
            : document.status === "DRAFT"
              ? "Continuer la préparation"
              : "Revoir les points ouverts",
      detail: document.title,
      href: document.status === "DRAFT" && document.progress.total === 0 ? `/documents/nouveau?brouillon=${document.id}` : `/documents/${document.id}`,
      urgent: document.status === "PENDING_SIGNATURE" || document.status === "PENDING_VALIDATION",
    }));
}

type Upcoming = Awaited<ReturnType<typeof userAgenda>>;

function UpcomingCard({ agenda }: { agenda: Upcoming }) {
  const items = [
    ...agenda.events.map((event) => ({
      key: event.id,
      day: event.day,
      sort: `${event.day}T${event.time}`,
      title: event.title,
      detail: `${event.kind === "MEETING" ? "Rencontre" : "Échéance"} · ${event.time.replace(":", " h ")} · ${event.documentTitle}`,
      href: `/documents/${event.documentId}?onglet=agenda`,
      badge: null as { dueDate: string; status: string } | null,
    })),
    ...agenda.deadlines.filter((deadline) => deadline.status !== "FINAL").map((deadline) => ({
      key: `due-${deadline.documentId}`,
      day: deadline.dueDate,
      sort: `${deadline.dueDate}T23:59`,
      title: deadline.title,
      detail: "Échéance de l'entente",
      href: `/documents/${deadline.documentId}?onglet=agenda`,
      badge: { dueDate: deadline.dueDate, status: deadline.status },
    })),
  ]
    .sort((a, b) => a.sort.localeCompare(b.sort))
    .slice(0, 5);
  return (
    <section className="rounded-2xl border border-[#e6eef8] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-[#10233f]">Échéances à venir</h2>
        <Link href="/agenda" className="text-sm text-[#2f6fed]">Agenda</Link>
      </div>
      <ul className="space-y-3">
        {items.length === 0 ? <li className="text-sm text-[#6b7280]">Rien de prévu dans les 30 prochains jours.</li> : null}
        {items.map((item) => (
          <li key={item.key}>
            <Link href={item.href} className="flex items-start gap-3 text-sm">
              <span className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-[#f4f7fb] py-1 text-[#10233f]">
                <span className="text-sm font-semibold leading-4">{Number(item.day.slice(8))}</span>
                <span className="text-[10px] text-[#6b7280]">{dayLabel(item.day, false).split(" ")[1]}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-[#10233f]">{item.title}</span>
                <span className="block truncate text-xs text-[#6b7280]">{item.detail}</span>
                {item.badge ? <DeadlineBadge dueDate={item.badge.dueDate} status={item.badge.status} className="mt-1" /> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TasksCard({ tasks }: { tasks: ReturnType<typeof tasksFor> }) {
  return (
    <section className="rounded-2xl border border-[#e6eef8] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-[#10233f]">Mes tâches</h2>
        <Link href="/documents" className="text-sm text-[#2f6fed]">Voir tout</Link>
      </div>
      <ul className="space-y-3">
        {tasks.length === 0 ? <li className="text-sm text-[#6b7280]">Aucune tâche ouverte.</li> : null}
        {tasks.map((task) => (
          <li key={task.id}>
            <Link href={task.href} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="block font-medium text-[#10233f]">{task.title}</span>
                <span className="block truncate text-xs text-[#6b7280]">{task.detail}</span>
              </span>
              {task.urgent ? <span className="shrink-0 rounded-full bg-[#fff1f0] px-2 py-0.5 text-[10px] font-medium text-[#c2410c]">Urgent</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ microsoft?: string; message?: string; reunion?: string }> }) {
  const user = await requireUser();
  const { microsoft, message, reunion } = await searchParams;
  const day = zoneDay(new Date());
  const [data, workspaces, desk, upcoming] = await Promise.all([
    getDashboard(user),
    listWorkspaces(user),
    getMicrosoftBoard(user.id),
    userAgenda(user, day, addDays(day, 30)),
  ]);
  const tasks = tasksFor(data.documents);
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="order-1 flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-[#10233f] sm:text-3xl">Bonjour {user.name.split(" ")[0]}</h1>
            <p className="mt-1 text-sm text-[#5e6875]">Voici un aperçu de vos ententes et de vos activités.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="hidden rounded-2xl border border-[#e6eef8] bg-white px-4 py-3 text-sm text-[#3f4854] shadow-sm md:block">
              « Des ententes claires pour des projets qui avancent. »
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[#e6eef8] bg-white px-3 py-1.5 text-xs text-[#3f4854] shadow-sm sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
              <Calendar className="h-4 w-4 text-[#2f6fed]" />
              <span className="capitalize">{today}</span>
            </div>
          </div>
        </div>

        <div className="order-2 -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 xl:order-3 xl:grid-cols-5">
          {kpis.map((item) => (
            <article key={item.key} className="min-w-[8.5rem] shrink-0 snap-start rounded-2xl border border-[#e6eef8] bg-white px-4 py-3 shadow-sm sm:min-w-0 sm:py-4">
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${item.tint}`}>
                <item.icon className="h-4 w-4" />
              </span>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-[#10233f] sm:mt-3">{data.counts[item.key]}</p>
              <p className="whitespace-nowrap text-xs text-[#6b7280]">{item.label}</p>
            </article>
          ))}
        </div>

        <div className="order-3 space-y-4 xl:hidden">
          <UpcomingCard agenda={upcoming} />
          <TasksCard tasks={tasks} />
        </div>

        <div className="order-4 min-w-0 space-y-3 xl:order-2">
        <MicrosoftWindows
          mail={desk.mail}
          meetings={desk.meetings}
          connected={desk.connected}
          configured={desk.configured}
          email={desk.email}
          error={desk.error}
          notice={microsoft}
          initialMailId={message}
          initialMeetingId={reunion}
          documentTitles={data.documents.map((item) => item.title)}
        />
        </div>

        <section className="order-5 overflow-hidden rounded-2xl border border-[#e6eef8] bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-4 sm:px-5">
            <h2 className="font-semibold text-[#10233f]">Mes documents récents</h2>
            <Link href="/documents" className="text-sm text-[#2f6fed]">Voir tout</Link>
          </div>
          <DocumentTable documents={data.documents} />
        </section>

        <section className="order-6 rounded-2xl border border-[#e6eef8] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-[#10233f]">Mes espaces</h2>
            <Link href="/espaces" className="text-sm text-[#2f6fed]">Voir tout</Link>
          </div>
          {workspaces.length === 0 ? (
            <p className="text-sm text-[#6b7280]">Aucun espace pour le moment. <Link href="/documents/nouveau" className="font-medium text-[#2f6fed]">Créez votre première entente</Link> pour en ouvrir un.</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workspaces.slice(0, 3).map((workspace) => (
              <Link key={workspace.id} href={`/espaces/${workspace.id}`} className="overflow-hidden rounded-2xl border border-[#eef2f7] hover:border-[#c9d7fb]">
                <div className="relative h-24">
                  <Image src={spaceImage(workspace.sector)} alt="" fill className="object-cover" />
                </div>
                <div className="p-3">
                  <p className="font-medium text-[#10233f]">{workspace.name}</p>
                  <p className="mt-1 text-xs text-[#6b7280]">{workspace.documents.length} document{workspace.documents.length > 1 ? "s" : ""} · {workspace.participants} participant{workspace.participants > 1 ? "s" : ""}</p>
                  <div className="mt-2"><ProgressBar value={workspace.progress.percent} label="" /></div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <aside className="min-w-0 space-y-4">
        <section className="rounded-2xl bg-[#12306b] p-4 text-white shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#9ec1ff]" />
            <p className="text-sm font-semibold">Assistant Misterdil</p>
          </div>
          <p className="mb-3 text-xs leading-5 text-white/75">Analysez, rédigez et améliorez vos documents avec l&apos;IA. Le modérateur décide.</p>
          <div className="rounded-xl bg-white p-3 text-[#12151a]">
            <AssistantPanel compact />
          </div>
        </section>

        <div className="hidden space-y-4 xl:block">
          <UpcomingCard agenda={upcoming} />
          <TasksCard tasks={tasks} />
        </div>

        <section className="rounded-2xl border border-[#e6eef8] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-[#10233f]">Activité récente</h2>
            <Link href="/activite" className="text-sm text-[#2f6fed]">Voir tout</Link>
          </div>
          <ul className="space-y-3">
            {data.activities.slice(0, 5).map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="block text-sm leading-5 text-[#243040] hover:text-[#2f6fed]">{item.message}</Link>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
