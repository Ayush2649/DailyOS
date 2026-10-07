// lib/orbit/temporalResolver.ts
/**
 * Resolve natural‑language temporal references to concrete date‑time ranges.
 * Supports the phrases required for Phase 1 (today, yesterday, etc.).
 * Uses the user's IANA timezone if provided, otherwise falls back to UTC.
 */
export interface TemporalRange {
  label: string;
  start: Date; // inclusive UTC instant
  end: Date;   // exclusive UTC instant
  timezone: string; // IANA timezone used for calculation
}

/** Helper: extract Y/M/D components of a Date in a given timezone. */
function getYMD(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'numeric', day: 'numeric', timeZone: tz,
  });
  const parts = fmt.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type === 'year' || p.type === 'month' || p.type === 'day') {
      map[p.type] = Number(p.value);
    }
  }
  return { year: map.year, month: map.month, day: map.day };
}

/** Add a number of days to a YMD tuple, returning a new YMD. */
function addDays(ymd: { year: number; month: number; day: number }, delta: number) {
  const d = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day));
  d.setUTCDate(d.getUTCDate() + delta);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Create a full‑day range (midnight‑to‑midnight) for a given YMD in UTC. */
function dayRange(ymd: { year: number; month: number; day: number }) {
  const start = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, 0, 0, 0));
  const end = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, 24, 0, 0));
  return { start, end };
}

/** Create a time‑window range within a specific day. */
function windowRange(
  ymd: { year: number; month: number; day: number },
  hourStart: number,
  hourEnd: number,
) {
  const start = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, hourStart, 0, 0));
  const end = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, hourEnd, 0, 0));
  return { start, end };
}

/** Main resolver */
export function resolveTemporalReference(
  phrase: string,
  userTimezone?: string,
  currentTime?: Date,
): TemporalRange {
  const tz = userTimezone || 'UTC'; // fallback documented in code comments
  const now = currentTime ?? new Date();
  const { year, month, day } = getYMD(now, tz);
  const lower = phrase.toLowerCase().trim();

  // today
  if (lower === 'today') {
    const { start, end } = dayRange({ year, month, day });
    return { label: 'today', start, end, timezone: tz };
  }

  // yesterday (full day)
  if (lower === 'yesterday') {
    const ymd = addDays({ year, month, day }, -1);
    const { start, end } = dayRange(ymd);
    return { label: 'yesterday', start, end, timezone: tz };
  }

  // yesterday <period>
  if (lower.startsWith('yesterday ')) {
    const period = lower.split(' ')[1];
    const ymd = addDays({ year, month, day }, -1);
    const windows: Record<string, [number, number]> = {
      morning: [6, 12],
      afternoon: [12, 17],
      evening: [17, 21],
      night: [21, 24],
    };
    const w = windows[period];
    if (w) {
      const { start, end } = windowRange(ymd, w[0], w[1]);
      return { label: `yesterday ${period}`, start, end, timezone: tz };
    }
  }

  // last night -> treat as yesterday night
  if (lower === 'last night') {
    const ymd = addDays({ year, month, day }, -1);
    const { start, end } = windowRange(ymd, 21, 24);
    return { label: 'last night', start, end, timezone: tz };
  }

  // this morning
  if (lower === 'this morning') {
    const { start, end } = windowRange({ year, month, day }, 6, 12);
    return { label: 'this morning', start, end, timezone: tz };
  }

  // this week (ISO week starting Monday)
  if (lower === 'this week') {
// Compute ISO weekday (Monday=1 .. Sunday=7) for the given timezone
    const utcMidnight = Date.UTC(year, month - 1, day);
    const weekdayUtc = new Date(utcMidnight).getUTCDay(); // 0=Sun
    const isoWeekday = ((weekdayUtc + 6) % 7) + 1; // Monday=1
    const mondayOffset = isoWeekday === 1 ? 0 : 1 - isoWeekday;
    const mondayYMD = addDays({ year, month, day }, mondayOffset);
    const start = new Date(Date.UTC(mondayYMD.year, mondayYMD.month - 1, mondayYMD.day, 0, 0, 0));
    const nextMondayYMD = addDays(mondayYMD, 7);
    const end = new Date(Date.UTC(nextMondayYMD.year, nextMondayYMD.month - 1, nextMondayYMD.day, 0, 0, 0));
    return { label: 'this week', start, end, timezone: tz };
  }

  // last week
  if (lower === 'last week') {
    // Compute ISO weekday (Monday=1 .. Sunday=7) for the given timezone
    const utcMidnight = Date.UTC(year, month - 1, day);
    const weekdayUtc = new Date(utcMidnight).getUTCDay(); // 0=Sun
    const isoWeekday = ((weekdayUtc + 6) % 7) + 1; // Monday=1
    const thisMondayOffset = isoWeekday === 1 ? 0 : 1 - isoWeekday;
    const thisMondayYMD = addDays({ year, month, day }, thisMondayOffset);
    const lastMondayYMD = addDays(thisMondayYMD, -7);
    const start = new Date(Date.UTC(lastMondayYMD.year, lastMondayYMD.month - 1, lastMondayYMD.day, 0, 0, 0));
    const end = new Date(Date.UTC(thisMondayYMD.year, thisMondayYMD.month - 1, thisMondayYMD.day, 0, 0, 0));
    return { label: 'last week', start, end, timezone: tz };
  }

  // two days ago (full day)
  if (lower === 'two days ago') {
    const ymd = addDays({ year, month, day }, -2);
    const { start, end } = dayRange(ymd);
    return { label: 'two days ago', start, end, timezone: tz };
  }

  // fallback – today range
  const { start, end } = dayRange({ year, month, day });
  return { label: lower || 'today', start, end, timezone: tz };
}
