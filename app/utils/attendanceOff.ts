// Philippine holidays — both regular and special non-working days.
// All are treated as OFF days (no attendance recorded).
// Update this list annually.
// Format: "YYYY-MM-DD": "Holiday Name"
export const PH_HOLIDAYS: Record<string, string> = {
  // 2025 Regular Holidays 
  "2025-01-01": "New Year's Day",
  "2025-04-09": "Araw ng Kagitingan",
  "2025-04-17": "Maundy Thursday",
  "2025-04-18": "Good Friday",
  "2025-05-01": "Labor Day",
  "2025-06-12": "Independence Day",
  "2025-08-25": "National Heroes Day",
  "2025-11-01": "All Saints' Day",
  "2025-11-30": "Bonifacio Day",
  "2025-12-25": "Christmas Day",
  "2025-12-30": "Rizal Day",

  // 2025 Special Non-Working Days 
  "2025-01-29": "Chinese New Year",
  "2025-04-19": "Black Saturday",
  "2025-08-21": "Ninoy Aquino Day",
  "2025-11-02": "All Souls' Day",
  "2025-12-08": "Feast of the Immaculate Conception",
  "2025-12-24": "Christmas Eve",
  "2025-12-31": "Last Day of the Year",

  // 2026 Regular Holidays
  "2026-01-01": "New Year's Day",
  "2026-03-20": "Eid'l Fitr",
  "2026-04-02": "Maundy Thursday",
  "2026-04-03": "Good Friday",
  "2026-04-09": "Araw ng Kagitingan",
  "2026-05-01": "Labor Day",
  "2026-05-27": "Eid'l Adha",
  "2026-06-12": "Independence Day",
  "2026-08-31": "National Heroes Day",
  "2026-11-30": "Bonifacio Day",
  "2026-12-25": "Christmas Day",
  "2026-12-30": "Rizal Day",

  // 2026 Special Non-Working Days 
  "2026-02-17": "Chinese New Year",
  "2026-04-04": "Black Saturday",
  "2026-08-21": "Ninoy Aquino Day",
  "2026-11-01": "All Saints' Day",
  "2026-11-02": "All Souls' Day",
  "2026-12-08": "Feast of the Immaculate Conception",
  "2026-12-24": "Christmas Eve",
  "2026-12-31": "Last Day of the Year",
};

// Returns today's date as YYYY-MM-DD in local time
export function localDateString(date?: Date): string {
  const d = date ?? new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

export type DayStatus =
  | { type: "workday" }
  | { type: "sunday"; label: "REST DAY" }
  | { type: "holiday"; label: string };

// Check if a given date is a Sunday or PH holiday
export function getDayStatus(date?: Date): DayStatus {
  const d = date ?? new Date();
  if (d.getDay() === 0) return { type: "sunday", label: "REST DAY" };
  const dateStr = localDateString(d);
  if (PH_HOLIDAYS[dateStr])
    return { type: "holiday", label: PH_HOLIDAYS[dateStr] };
  return { type: "workday" };
}

// Returns true if staff should be blocked from logging in right now
export function isOffDuty(date?: Date): boolean {
  return getDayStatus(date).type !== "workday";
}

// Returns true if it is past noon (12:00 PM) — login cutoff for attendance
export function isPastNoon(date?: Date): boolean {
  const d = date ?? new Date();
  return d.getHours() >= 12;
}
