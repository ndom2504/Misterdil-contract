import Image from "next/image";
import { cn } from "@/lib/cn";

export function Logo({
  className,
  wordmark = true,
  tone = "dark",
}: {
  className?: string;
  wordmark?: boolean;
  tone?: "dark" | "light";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image src="/brand/logo.png" alt="" width={72} height={42} className="h-9 w-auto" priority />
      {wordmark ? (
        <span className={cn("text-sm font-semibold tracking-tight", tone === "light" ? "text-white" : "text-[#12151a]")}>
          Misterdil
        </span>
      ) : null}
    </span>
  );
}
