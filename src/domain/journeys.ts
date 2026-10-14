export type LocalDate = `${number}-${number}-${number}`;

export interface Journey {
  id: string;
  startDate: LocalDate;
  endDateExclusive: LocalDate;
  timezone: string;
}

export function addCalendarMonths(date: LocalDate, months: number): LocalDate {
  const [year, month, day] = date.split("-").map(Number);
  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return formatDate(targetYear, normalizedMonth + 1, Math.min(day, lastDay));
}

export function createJourney(id: string, startDate: LocalDate, timezone: string): Journey {
  if (!isValidTimeZone(timezone)) throw new Error(`Invalid IANA timezone: ${timezone}`);
  return { id, startDate, endDateExclusive: addCalendarMonths(startDate, 3), timezone };
}

export function isJourneyDate(journey: Journey, date: LocalDate): boolean {
  return date >= journey.startDate && date < journey.endDateExclusive;
}

export function daysBetween(start: LocalDate, endExclusive: LocalDate): number {
  const startTime = dateToUtc(start).getTime();
  const endTime = dateToUtc(endExclusive).getTime();
  return Math.round((endTime - startTime) / 86_400_000);
}

export function localDateInTimeZone(timestamp: Date, timezone: string): LocalDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(timestamp);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}` as LocalDate;
}

export function formatDate(year: number, month: number, day: number): LocalDate {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}` as LocalDate;
}

function dateToUtc(date: LocalDate): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}
