export function ProgressBar({ value, label = "Progression globale" }: { value: number; label?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-[#5e6875]">
        <span>{label}</span>
        <span className="font-semibold text-[#12151a]">{value} %</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#eef0f3]">
        <div className="h-full rounded-full bg-[#1e4ed8]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}
