export function formatCount(n: number | undefined): string {
  if (n === undefined || n === null) return "0";
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1_000_000) return `${(n / 10000).toFixed(1)}w`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

/** Chinese count notation for card metadata: 9999, 1.2万, 3.4亿. */
export function formatViewCount(n: number | undefined): string {
  if (n === undefined || n === null || !Number.isFinite(n) || n < 0) return "0";
  const compact = (value: number, unit: string) =>
    `${(Math.floor(value * 10) / 10).toFixed(1).replace(/\.0$/, "")}${unit}`;
  if (n < 10_000) return String(Math.floor(n));
  if (n < 100_000_000) return compact(n / 10_000, "万");
  return compact(n / 100_000_000, "亿");
}

/** Normalize the API's minute-based duration for video card time badges. */
export function formatVideoDuration(value: string): string {
  const match = /^(?:(\d+):)?(\d+):([0-5]\d)$/.exec(value);
  if (!match) return value;

  const totalSeconds = Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  if (!Number.isSafeInteger(totalSeconds)) return value;

  // Compact clock format: 0:33, 7:01, 1:30:15.
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}
