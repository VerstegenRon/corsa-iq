// A minimal iCalendar (RFC 5545) writer for the agenda subscription: all-day entries, and entries
// at a time of day in Dutch time.

export type CalendarEntry = {
  uid: string;
  summary: string;
  description?: string | null;
  url?: string;
  /** First day, YYYY-MM-DD. */
  date: string;
  /** Last day, inclusive; all-day entries only. */
  lastDate?: string;
  /** HH:mm in Europe/Amsterdam; without it the entry lasts the whole day (or days). */
  time?: string | null;
};

function escape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets are folded, continuing with a space. */
function fold(line: string): string {
  const bytes = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    if (bytes.encode(current + char).length > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = "";
    }
    current += char;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const compactDate = (date: string) => date.replaceAll("-", "");

function nextDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Central European time with its daylight saving rules, so a time of day stays right all year.
const AMSTERDAM = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Amsterdam",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

export function buildCalendar(name: string, entries: CalendarEntry[], now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CorsaIQ//Agenda//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(name)}`,
    "X-WR-TIMEZONE:Europe/Amsterdam",
    // Ask calendar apps to fetch changes every few hours.
    "REFRESH-INTERVAL;VALUE=DURATION:PT4H",
    "X-PUBLISHED-TTL:PT4H",
    ...AMSTERDAM,
  ];
  for (const entry of entries) {
    lines.push("BEGIN:VEVENT", `UID:${entry.uid}`, `DTSTAMP:${stamp}`, `SUMMARY:${escape(entry.summary)}`);
    if (entry.time) {
      lines.push(`DTSTART;TZID=Europe/Amsterdam:${compactDate(entry.date)}T${entry.time.replace(":", "").slice(0, 4)}00`, "DURATION:PT1H");
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(entry.date)}`, `DTEND;VALUE=DATE:${compactDate(nextDay(entry.lastDate ?? entry.date))}`);
      lines.push("TRANSP:TRANSPARENT");
    }
    if (entry.description) lines.push(`DESCRIPTION:${escape(entry.description)}`);
    if (entry.url) lines.push(`URL:${entry.url}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
