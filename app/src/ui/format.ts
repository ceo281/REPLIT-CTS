/** Amounts are stored as integer minor units (cents). */

export function money(minor: number, currency = "USD"): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor) / 100;
  try {
    return (
      sign +
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
      }).format(abs)
    );
  } catch {
    return `${sign}$${abs.toFixed(2)}`;
  }
}

export function num(n: number): string {
  return new Intl.NumberFormat().format(n);
}

/** Parse a user-entered decimal string into integer minor units. */
export function parseMoney(input: string): number {
  const n = Number.parseFloat(input.replace(/[^0-9.\-]/g, ""));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function dateShort(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function timeShort(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function dateTime(ms: number): string {
  return `${dateShort(ms)} · ${timeShort(ms)}`;
}

export function relative(ms: number, now = Date.now()): string {
  const diff = now - ms;
  const day = 86_400_000;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < day) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return dateShort(ms);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Convert a local datetime-input value to epoch ms and back. */
export function toDatetimeLocal(ms: number): string {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

export function fromDatetimeLocal(v: string): number {
  return new Date(v).getTime();
}
