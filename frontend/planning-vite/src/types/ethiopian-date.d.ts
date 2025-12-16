declare module 'ethiopian-date' {
  export type DateTuple = [number, number, number];

  // Convert Gregorian -> Ethiopian
  export function toEthiopian(year: number, month: number, day: number): DateTuple;
  export function toEthiopian(date: DateTuple): DateTuple;

  // Convert Ethiopian -> Gregorian
  export function toGregorian(year: number, month: number, day: number): DateTuple;
  export function toGregorian(date: DateTuple): DateTuple;
}
