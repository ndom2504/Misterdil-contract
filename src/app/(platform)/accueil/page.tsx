import Image from "next/image";
import Link from "next/link";
import { Calendar, CheckCircle2, FileText, MessageSquare, PenLine, Sparkles } from "lucide-react";
import { AssistantPanel } from "@/components/assistant-panel";
import { DocumentTable } from "@/components/document-table";
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

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ microsoft?: string; message?: string; reunion?: string }> }) {
  const user = await requireUser();
  const { microsoft, message, reunion } = await searchParams;
  const [data, workspaces, desk] = await Promise.all([getDashboard(user), listWorkspaces(user), getMicrosoftBoard(user.id)]);
  const tasks = tasksFor(data.documents);
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#10233f] sm:text-3xl">Bonjour {user.name.split(" ")[0]}</h1>
            <p className="mt-1 text-sm text-[#5e6875]">Voici un aperçu de vos ententes et de vos activités.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-[#e6eef8] bg-white px-4 py-3 text-sm text-[#3f4854] shadow-sm">
              « Des ententes claires pour des projets qui avancent. »
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-[#e6eef8] bg-white px-4 py-3 text-sm text-[#3f4854] shadow-sm">
              <Calendar className="h-4 w-4 text-[#2f6fed]" />
              <span className="capitalize">{today}</span>
            </div>
          </div>
        </div>

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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map((item) => (
            <article key={item.key} className="rounded-2xl border border-[#e6eef8] bg-white px-4 py-4 shadow-sm">
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${item.tint}`}>
                <item.icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-[#10233f]">{data.counts[item.key]}</p>
              <p className="text-xs text-[#6b7280]">{item.label}</p>
            </article>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#e6eef8] bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-semibold text-[#10233f]">Mes documents récents</h2>
            <Link href="/documents" className="text-sm text-[#2f6fed]">Voir tout</Link>
          </div>
          <DocumentTable documents={data.documents} />
        </section>

        <section className="rounded-2xl border border-[#e6eef8] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-[#10233f]">Mes espaces</h2>
            <Link href="/espaces" className="text-sm text-[#2f6fed]">Voir tout</Link>
          </div>
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

      <aside className="space-y-4">
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
                  <span>
                    <span className="block font-medium text-[#10233f]">{task.title}</span>
                    <span className="block text-xs text-[#6b7280]">{task.detail}</span>
                  </span>
                  {task.urgent ? <span className="rounded-full bg-[#fff1f0] px-2 py-0.5 text-[10px] font-medium text-[#c2410c]">Urgent</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>

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
