'use client'

export const LAGOS_TIME_ZONE = 'Africa/Lagos'

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: LAGOS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: LAGOS_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function toDate(value: Date | string): Date {
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

export function toLagosDateKey(value: Date | string = new Date()): string {
  return dateFormatter.format(toDate(value))
}

export function isSameLagosDay(a: Date | string, b: Date | string = new Date()): boolean {
  return toLagosDateKey(a) === toLagosDateKey(b)
}

export function getLagosTimeHHMM(value: Date | string = new Date()): string {
  return timeFormatter.format(toDate(value))
}
