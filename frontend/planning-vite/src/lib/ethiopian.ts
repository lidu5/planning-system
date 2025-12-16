import { toEthiopian, toGregorian } from "ethiopian-date";

// Get current Ethiopian date
export function getCurrentEthiopianDate() {
  const now = new Date();
  return toEthiopian(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );
}

// Convert any Gregorian date to Ethiopian
export function gregorianToEthiopian(date: Date) {
  return toEthiopian(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
}

// Convert Ethiopian date back to Gregorian
export function ethiopianToGregorian(year: number, month: number, day: number) {
  return toGregorian(year, month, day);
}

// Get current Ethiopian year
export function currentEthiopianYear(d: Date = new Date()): number {
  const gy = d.getFullYear();
  const isLeap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const newYearDay = isLeap ? 12 : 11;
  const month = d.getMonth();
  const day = d.getDate();
  if (month > 8) return gy - 7;
  if (month < 8) return gy - 8;
  return day >= newYearDay ? gy - 7 : gy - 8;
}

// Convert Ethiopian year to Gregorian year
export function toGregorianYearFromEthiopian(etYear: number): number {
  return etYear + 7;
}

// Convert Gregorian year to Ethiopian year
export function toEthiopianYearFromGregorian(grYear: number): number {
  return grYear - 7;
}
