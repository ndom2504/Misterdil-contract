export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-white" />
      <div className="grid gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-white" />)}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-white" />
    </div>
  );
}
