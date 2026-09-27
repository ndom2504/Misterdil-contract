"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function LandingTone() {
  useEffect(() => {
    const previous = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#07111c";
    return () => {
      document.body.style.backgroundColor = previous;
    };
  }, []);
  return null;
}

export function Reveal({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "armed" | "shown">("idle");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setState("shown");
      return;
    }

    const visibleNow = node.getBoundingClientRect().top < window.innerHeight * 0.9;
    if (visibleNow) {
      setState("shown");
      return;
    }

    setState("armed");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setState("shown");
        observer.disconnect();
      },
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      id={id}
      ref={ref}
      className={cn(
        "scroll-mt-24",
        "[&_[data-reveal-child]]:transition-all [&_[data-reveal-child]]:duration-700 [&_[data-reveal-child]]:ease-out",
        state === "armed" && "[&_[data-reveal-child]]:translate-y-8 [&_[data-reveal-child]]:opacity-0",
        state === "shown" && "[&_[data-reveal-child]]:translate-y-0 [&_[data-reveal-child]]:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}

