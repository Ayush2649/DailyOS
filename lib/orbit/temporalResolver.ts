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
  let tz = userTimezone || 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
  } catch {
    tz = 'UTC';
  }
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
  // last 7 days (rolling window)
  if (lower === 'last 7 days' || lower === 'last seven days' || lower === 'past 7 days') {
    const startYmd = addDays({ year, month, day }, -6); // include today + 6 previous days
    const { start } = dayRange(startYmd);
    const { end } = dayRange({ year, month, day }); // exclusive end (midnight of next day)
    return { label: 'last 7 days', start, end, timezone: tz };
  }

  // two weeks ago (full day)
  if (lower === 'two weeks ago') {
    const ymd = addDays({ year, month, day }, -14);
    const { start, end } = dayRange(ymd);
    return { label: 'two weeks ago', start, end, timezone: tz };
  }

  // explicit date like "on october 4" or "october 4"
  const explicitDateMatch = lower.match(/^on?\s*([a-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/i);
  if (explicitDateMatch) {
    const monthName = explicitDateMatch[1];
    const dayNum = Number(explicitDateMatch[2]);
    const yearNum = explicitDateMatch[3] ? Number(explicitDateMatch[3]) : year;
    const monthMap: Record<string, number> = {
      january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
      july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    };
    const month = monthMap[monthName.toLowerCase()];
    if (month) {
      const { start, end } = dayRange({ year: yearNum, month, day: dayNum });
      return { label: `${monthName} ${dayNum}`, start, end, timezone: tz };
    }
  }

  // arbitrary range e.g., "from march 1 to march 5"
  const rangeMatch = lower.match(/^from\s+([a-z]+\s+\d{1,2})\s+to\s+([a-z]+\s+\d{1,2})(?:,\s*(\d{4}))?$/i);
  if (rangeMatch) {
    const monthMap: Record<string, number> = {
      january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
      july: 7, august: 8, september: 9, october: 10, November: 11, december: 12,
    };
    const parse = (text: string, defaultYear: number) => {
      const parts = text.trim().split(/\s+/);
      const month = monthMap[parts[0].toLowerCase()];
      const day = Number(parts[1]);
      const yr = rangeMatch[3] ? Number(rangeMatch[3]) : defaultYear;
      return { year: yr, month: month!, day };
    };
    const startYmd = parse(rangeMatch[1], year);
    const endYmd = parse(rangeMatch[2], year);
    const { start } = dayRange(startYmd);
    const { end } = dayRange(addDays(endYmd, 1)); // exclusive end
    return { label: `from ${rangeMatch[1]} to ${rangeMatch[2]}`, start, end, timezone: tz };
  }

  // compare two periods, e.g., "compare this week with last week"
  if (lower.startsWith('compare ')) {
    const compareMatch = lower.match(/^compare\s+(.+?)\s+with\s+(.+)$/);
    if (compareMatch) {
      const first = resolveTemporalReference(compareMatch[1].trim(), tz, now);
      const second = resolveTemporalReference(compareMatch[2].trim(), tz, now);
      const start = first.start < second.start ? first.start : second.start;
      const end = first.end > second.end ? first.end : second.end;
      return { label: `compare ${compareMatch[1]} with ${compareMatch[2]}`, start, end, timezone: tz };
    }
  }

  // fallback – today range
  const { start, end } = dayRange({ year, month, day });
  return { label: lower || 'today', start, end, timezone: tz };}
