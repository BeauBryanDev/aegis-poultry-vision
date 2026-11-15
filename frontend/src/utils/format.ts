/** Presentation formatting helpers. */

const numberFmt = new Intl.NumberFormat("en-US");

/** 1256 -> "1,256" */
export function formatNumber(n: number): string {
  return numberFmt.format(n);
}

/** 95.42 -> "95.4%" */
export function formatPercent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

/** 18.73 -> "18.7" */
export function formatDecimal(n: number, digits = 1): string {
  return n.toFixed(digits);
}

/** ISO string -> "14:32" (24h, local). */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** 72.4 seconds -> "1:12.4" (video time). */
export function formatVideoTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

/** Merge conditional class names (tiny clsx). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
