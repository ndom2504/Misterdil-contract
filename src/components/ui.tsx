import { cn } from "@/lib/cn";

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-[#1e4ed8] text-white hover:bg-[#173ea8]",
        variant === "secondary" && "border border-[#e6e8ee] bg-white text-[#12151a] hover:bg-[#f7f8fa]",
        variant === "ghost" && "text-[#1e4ed8] hover:bg-[#eef3ff]",
        variant === "danger" && "text-[#9f2d2d] hover:bg-[#fff4f4]",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#12151a]">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs leading-5 text-[#5e6875]">{hint}</span> : null}
    </label>
  );
}

export const controlClass =
  "w-full rounded-lg border border-[#e1e4ea] bg-white px-3 py-2.5 text-sm text-[#12151a] outline-none transition placeholder:text-[#98a0ab] focus:border-[#1e4ed8] focus:ring-2 focus:ring-[#d9e4ff]";

export function Card({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return <section id={id} className={cn("rounded-xl border border-[#e6e8ee] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]", className)}>{children}</section>;
}
