import Image from "next/image";
import { cn } from "@/lib/cn";

export function Logo({
  className,
  wordmark = true,
  tone = "dark",
  stack = false,
}: {
  className?: string;
  wordmark?: boolean;
  tone?: "dark" | "light";
  stack?: boolean;
}) {
  const name = tone === "light" ? "text-white" : "text-[#12151a]";
  const slogan = tone === "light" ? "text-white/70" : "text-[#8b939e]";

  if (stack) {
    return (
      <span className={cn("inline-flex flex-col items-center text-center leading-tight", className)}>
        <Image src="/brand/logo.png" alt="" width={72} height={42} className="h-9 w-auto" priority />
        {wordmark ? <span className={cn("mt-1 text-sm font-semibold tracking-tight", name)}>Misterdil</span> : null}
        <span className={cn("text-[10px]", slogan)}>Collaboration smart</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image src="/brand/logo.png" alt="" width={72} height={42} className="h-9 w-auto" priority />
      {wordmark ? <span className={cn("text-sm font-semibold tracking-tight", name)}>Misterdil</span> : null}
    </span>
  );
}
