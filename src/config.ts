try {
  process.loadEnvFile()
} catch {}

function required(name: string, fallback: string): string {
  const value = process.env[name]?.trim()
  return value ? value : fallback
}

function toNumber(name: string, raw: string): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid ${name}: "${raw}"`)
  return n
}

const cutoffRaw = required('CUTOFF_DATE', '2026-09-14T11:51:00-03:00')
const cutoffDate = new Date(cutoffRaw)
if (Number.isNaN(cutoffDate.getTime())) throw new Error(`Invalid CUTOFF_DATE: "${cutoffRaw}"`)

const timeZone = required('TIMEZONE', 'America/Sao_Paulo')
const guildStatsTimeZone = required('GUILDSTATS_TIMEZONE', 'Europe/Berlin')
new Intl.DateTimeFormat('en-US', { timeZone })
new Intl.DateTimeFormat('en-US', { timeZone: guildStatsTimeZone })

export const config = {
  port: toNumber('PORT', required('PORT', '3000')),
  characterName: required('CHARACTER_NAME', 'Chubiirou Marea'),
  cutoffDate,
  timeZone,
  // GuildStats mostra os horários no fuso do tibia.com (CET/CEST), não no fuso de saída
  guildStatsTimeZone,
  guildStatsBaseUrl: required('GUILDSTATS_BASE_URL', 'https://guildstats.eu').replace(/\/+$/, ''),
  guildStatsTimeoutMs: toNumber('GUILDSTATS_TIMEOUT_MS', required('GUILDSTATS_TIMEOUT_MS', '10000')),
  isProduction: process.env.NODE_ENV === 'production',
}
