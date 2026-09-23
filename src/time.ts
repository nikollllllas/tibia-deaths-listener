export function offsetMinutes(date: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value
  const m = name?.match(/GMT([+-])(\d{2}):(\d{2})/)
  if (!m) return 0
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]))
}

export function zonedTimeToDate(
  year: number, month: number, day: number, hour: number, minute: number, timeZone: string,
): Date {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute)
  let ts = asUtc - offsetMinutes(new Date(asUtc), timeZone) * 60_000
  ts = asUtc - offsetMinutes(new Date(ts), timeZone) * 60_000
  return new Date(ts)
}

export function formatInZone(date: Date, timeZone: string): string {
  const off = offsetMinutes(date, timeZone)
  const local = new Date(date.getTime() + off * 60_000).toISOString().slice(0, 19)
  const sign = off < 0 ? '-' : '+'
  const abs = Math.abs(off)
  const hh = String(Math.floor(abs / 60)).padStart(2, '0')
  const mm = String(abs % 60).padStart(2, '0')
  return `${local}${sign}${hh}:${mm}`
}
