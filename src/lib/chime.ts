let audio: HTMLAudioElement | null = null;

// Browsers refuse to play sound before the first user interaction; that case is simply silent.
export function playChime() {
  if (typeof window === "undefined") return;
  try {
    audio ??= new Audio("/sounds/misterdil_pop.wav");
    audio.volume = 0.55;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  } catch {
    audio = null;
  }
}
