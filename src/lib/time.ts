// relative-time formatting in the voice.md style:
//   "just now" / "2 days ago" / "last week" / "2025·08·14"
//
// keep server/client output stable — use UTC arithmetic only.

export function relativeTime(when: Date | string | number): string {
  const t =
    typeof when === 'number'
      ? when
      : when instanceof Date
        ? when.getTime()
        : new Date(when).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.floor((now - t) / 1000));

  if (sec < 45) return 'just now';
  if (sec < 90) return 'a minute ago';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minutes ago`;
  if (min < 120) return 'an hour ago';
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hours ago`;
  if (hr < 48) return 'yesterday';
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} days ago`;
  if (day < 14) return 'last week';
  if (day < 60) return `${Math.floor(day / 7)} weeks ago`;
  if (day < 365) return `${Math.floor(day / 30)} months ago`;
  return `${Math.floor(day / 365)} years ago`;
}

// absolute date in voice.md style: 2025·08·14 (dot-separator, two-digit parts)
export function absoluteDate(when: Date | string | number): string {
  const d =
    when instanceof Date ? when : new Date(typeof when === 'number' ? when : when);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}·${mo}·${da}`;
}
