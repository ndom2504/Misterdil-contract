import Link from "next/link";
import { Search } from "lucide-react";
import { Card, controlClass } from "@/components/ui";
import { cn } from "@/lib/cn";

export type AdminSearch = { q?: string; page?: string; ok?: string; erreur?: string; vue?: string };

export function readSearch(params: AdminSearch) {
  const q = (params.q ?? "").trim().slice(0, 100);
  const page = Math.max(0, Number.parseInt(params.page ?? "0", 10) || 0);
  return { q, page };
}

// The URL the page is on, so actions can come back to the same search and page.
export function currentUrl(path: string, params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "" && value !== 0) search.set(key, String(value));
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function bytes(value: number) {
  if (value < 1024) return `${value} o`;
  if (value < 1024 ** 2) return `${Math.round(value / 1024)} Ko`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1).replace(".", ",")} Mo`;
  return `${(value / 1024 ** 3).toFixed(2).replace(".", ",")} Go`;
}

export function PageHead({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-[#10233f]">{title}</h1>
      <p className="mt-1 text-sm text-[#5e6875]">{text}</p>
    </div>
  );
}

export function Notice({ ok, erreur }: { ok?: string; erreur?: string }) {
  if (!ok && !erreur) return null;
  return (
    <p className={cn("rounded-lg px-4 py-2.5 text-sm", erreur ? "bg-[#fdecec] text-[#9f2d2d]" : "bg-[#e7f8ee] text-[#14804a]")}>
      {(erreur ?? ok ?? "").slice(0, 200)}
    </p>
  );
}

export function SearchBar({ path, q, placeholder, extra }: { path: string; q: string; placeholder: string; extra?: Record<string, string> }) {
  return (
    <form action={path} className="relative max-w-md">
      {Object.entries(extra ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#98a0ab]" />
      <input name="q" defaultValue={q} placeholder={placeholder} className={cn(controlClass, "pl-9")} />
    </form>
  );
}

export function Pager({ path, page, total, size, params }: { path: string; page: number; total: number; size: number; params: Record<string, string> }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return <p className="text-xs text-[#8b939e]">{total} résultat{total > 1 ? "s" : ""}</p>;
  const link = (target: number) => currentUrl(path, { ...params, page: target });
  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-xs text-[#8b939e]">
        {total} résultats · page {page + 1} sur {pages}
      </p>
      <div className="flex gap-2">
        {page > 0 ? <Link href={link(page - 1)} className="rounded-lg border border-[#e6e8ee] bg-white px-3 py-1.5">Précédent</Link> : null}
        {page + 1 < pages ? <Link href={link(page + 1)} className="rounded-lg border border-[#e6e8ee] bg-white px-3 py-1.5">Suivant</Link> : null}
      </div>
    </div>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty: boolean }) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-[#eef0f3] bg-[#f9fafb] text-xs text-[#5e6875]">
          <tr>
            {head.map((label, index) => (
              <th key={label || index} className="px-4 py-2.5 font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f2f3f6]">
          {empty ? (
            <tr>
              <td colSpan={head.length} className="px-4 py-10 text-center text-[#8b939e]">
                Aucun résultat.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </Card>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-[#5e6875]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#10233f]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#8b939e]">{hint}</p> : null}
    </Card>
  );
}
