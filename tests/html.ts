export interface Row {
  when: string
  level: number
  killerHtml?: string
}

export const monster = (name: string) => `<span x-data="{ more: false }"><span class="text-gray-300">${name}</span></span>`

export const pvp = (player: string, level: number, other: string) => `
  <span x-data="{ more: false }">
    <a href="/character/${player.replace(/ /g, '+')}" class="text-guild-green">${player}</a>
    <span class="text-gray-500 text-xs">${level}</span><span class="text-gray-500">, </span>
    <a href="/bosses/${other}" class="text-guild-green">${other} <i class="fas fa-dragon"></i></a>
    <span class="relative" x-data="{ open: false }">
      <i class="fas fa-user text-red-400 text-xs ml-1"></i>
      <div x-show="open" x-cloak>PvP</div>
    </span>
  </span>`

export function table(rows: Row[]): string {
  return `<div><table>
    <thead><tr><th>#</th><th>When</th><th>Killed by</th><th>Lvl</th><th>Exp lost <div x-show="open">Approximate</div></th></tr></thead>
    <tbody>${rows
      .map(
        (r, i) => `<tr>
        <td>${i + 1}</td>
        <td><span class="hidden md:inline">${r.when}</span><span class="md:hidden">${r.when.slice(0, 5)} ${r.when.slice(11)}</span></td>
        <td>${r.killerHtml ?? monster('dragon')}</td>
        <td>${r.level}</td>
        <td><span class="hidden md:inline">-1,000</span></td>
      </tr>`,
      )
      .join('')}</tbody></table></div>`
}

export function fullPage(rows: Row[], totalPages: number): string {
  return `<div><div id="death-table-wrapper">${table(rows)}</div>
    <div x-data="deathPagination(${totalPages}, 1)"></div>
    <script>function deathPagination(total, current) {}</script></div>`
}
