# tibia-deaths-listener

REST API (Node.js + TypeScript + Express) com estatísticas de mortes do personagem **Chubiirou Marea**, calculadas em tempo real a partir do HTML do [GuildStats](https://guildstats.eu).

Sem banco de dados, sem cache e sem estado: cada requisição busca o GuildStats, faz o parsing, aplica o cutoff e calcula tudo de novo.

```
Route → services/deaths.ts (paginação + cutoff) → guildstats/client.ts (HTTP)
                                                → guildstats/parser.ts (Cheerio)
      → services/statistics.ts (cálculos puros)
```

## Fonte de dados

- Página 1: `GET {GUILDSTATS_BASE_URL}/include/character/tab.php?nick=<nome>&tab=deaths`
- Páginas N ≥ 2: `...&tab=deaths&part=table&page=N`
- O total de páginas vem do widget `deathPagination(<total>, <atual>)` no próprio HTML.
- As páginas vão da morte mais recente para a mais antiga. A coleta para assim que uma página contém uma morte **anterior** ao cutoff (usa a menor data da página, não a última linha). Uma página vazia antes do fim gera erro 502 em vez de truncar os dados em silêncio. Mortes duplicadas (linhas que “escorregam” de página quando entra uma morte nova durante a coleta) são removidas.
- O GuildStats só atualiza as mortes uma vez por dia. As mortes mais recentes vêm do tibia.com via [TibiaData](https://api.tibiadata.com) (`/v4/character/<nome>`, cache de 5 min) e são mescladas com as do GuildStats (mesmo minuto + nível = mesma morte). Se a TibiaData falhar, a API segue só com o GuildStats.
- As datas `DD-MM-YYYY HH:mm` são interpretadas no fuso `GUILDSTATS_TIMEZONE` (padrão `Europe/Berlin`, o fuso do tibia.com) e devolvidas no fuso `TIMEZONE` em ISO 8601 com offset (`2026-09-21T12:42:00-03:00`).

## Regras

- **Período analisado**: `death.date >= CUTOFF_DATE` (a morte do cutoff entra).
- **daysWithoutDeath**: dias inteiros desde a última morte, **arredondados para baixo** (1d 21h → `1`). O detalhamento está em `timeWithoutDeath: { days, hours, minutes }`, com todos os campos arredondados para baixo. `null` quando não há mortes.
- **Recorde**: maior período sem morrer. Os candidatos são os intervalos entre mortes consecutivas do período **e** a sequência atual (última morte → agora). Em empate, vale o período mais antigo, então a sequência atual só vira recorde quando **supera** o anterior. Nesse caso, `ongoing: true` e `to: null`, e a duração cresce a cada requisição. `days/hours/minutes` são arredondados para baixo. Sem mortes no período, não existe recorde. O recorde é recalculado a cada requisição.
- **PvP**: `pvp: true` quando a linha tem o ícone PvP ou um jogador (`/character/...`) entre os matadores.

## Endpoints

Todos são `GET`, sem autenticação, respondem JSON e mandam `Access-Control-Allow-Origin: *`.

**Documentação interativa (Swagger UI):** `GET /docs`. A especificação OpenAPI 3.0 fica em `GET /openapi.json` (fonte: `src/openapi.ts`) e traz exemplos de todos os status: 200 (incluindo os casos de recorde atual e de nenhuma morte), 404, 500 e 502 (produção e desenvolvimento).

### `GET /health`
Não acessa o GuildStats. Serve para o cron-job.org manter o serviço acordado.
```json
{ "status": "ok" }
```

### `GET /stats`
```json
{
  "character": "Chubiirou Marea",
  "cutoff": "2026-09-14T11:51:00-03:00",
  "totalDeaths": 10,
  "lastDeath": { "date": "2026-09-21T12:42:00-03:00", "level": 973, "killer": "dreadful harvester", "killers": ["dreadful harvester"], "pvp": false },
  "daysWithoutDeath": 2,
  "timeWithoutDeath": { "days": 2, "hours": 0, "minutes": 10 },
  "record": { "days": 2, "hours": 1, "minutes": 6, "from": "2026-09-16T16:41:00-03:00", "to": "2026-09-18T17:47:00-03:00", "ongoing": false }
}
```
Sem mortes: `lastDeath`, `daysWithoutDeath`, `timeWithoutDeath` e `record` vêm como `null`.

### `GET /deaths`
Mortes do período, da mais recente para a mais antiga (útil para debug).
```json
{
  "character": "Chubiirou Marea",
  "cutoff": "2026-09-14T11:51:00-03:00",
  "total": 10,
  "deaths": [
    { "date": "2026-09-21T12:42:00-03:00", "level": 973, "killer": "dreadful harvester", "killers": ["dreadful harvester"], "pvp": false }
  ]
}
```

### `GET /record`
Pensado para o StreamElements. O formato é sempre o mesmo.
```json
{ "days": 2, "hours": 1, "minutes": 6, "from": "2026-09-16T16:41:00-03:00", "to": "2026-09-18T17:47:00-03:00", "ongoing": false }
```
Quando a sequência atual é o recorde:
```json
{ "days": 3, "hours": 21, "minutes": 18, "from": "2026-09-21T12:42:00-03:00", "to": null, "ongoing": true }
```
Sem mortes no período: `{ "days": null, "hours": null, "minutes": null, "from": null, "to": null, "ongoing": false }`.

### Erros
| Status | Quando | Corpo |
|---|---|---|
| 404 | rota inexistente | `{ "error": "Not found" }` |
| 502 | GuildStats fora do ar, timeout, status HTTP de erro ou HTML inesperado | `{ "error": "Failed to fetch GuildStats" }` |
| 500 | erro interno | `{ "error": "Internal server error" }` |

Fora de produção (`NODE_ENV !== "production"`), a resposta também traz um campo `detail`. Os erros completos sempre vão para o log do servidor.

## Configuração

Copie `.env.example` para `.env`. O arquivo é carregado com `process.loadEnvFile`, e variáveis já definidas no ambiente têm prioridade.

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta HTTP (o Render define a sua) |
| `CHARACTER_NAME` | `Chubiirou Marea` | Personagem consultado |
| `CUTOFF_DATE` | `2026-09-14T11:51:00-03:00` | Início do período (inclusivo), em ISO 8601 |
| `GUILDSTATS_BASE_URL` | `https://guildstats.eu` | Base das URLs do GuildStats |
| `TIMEZONE` | `America/Sao_Paulo` | Fuso usado para formatar as datas |
| `GUILDSTATS_TIMEZONE` | `Europe/Berlin` | Fuso em que o GuildStats exibe as datas (CET/CEST) |
| `GUILDSTATS_TIMEOUT_MS` | `10000` | Timeout de cada requisição ao GuildStats |

Variáveis vazias usam o valor padrão.

## Rodando localmente

Requer Node.js 22+ e **pnpm 12** (versão fixada em `packageManager` no `package.json`). Não use npm nem yarn: o lockfile do projeto é o `pnpm-lock.yaml`.

```bash
pnpm install
pnpm dev

pnpm test
pnpm typecheck

pnpm build
pnpm start
```

O `pnpm-workspace.yaml` define quais dependências podem rodar scripts de instalação (o pnpm 12 falha a instalação se houver algum pendente): `esbuild` é liberado e `@scarf/scarf` (telemetria do swagger-ui) é bloqueado.

## Deploy no Render

Arquivos de deploy: `render.yaml` (Blueprint) e `.node-version` (Node 22).

### Opção A: Blueprint (recomendado)
1. Suba o projeto para um repositório no GitHub ou GitLab.
2. No Render: **New → Blueprint** e selecione o repositório. O `render.yaml` cria o Web Service com build, start, health check e variáveis de ambiente.
3. Para mudar o personagem ou o cutoff depois, edite as variáveis em **Environment** no painel.

### Opção B: Web Service manual
| Campo | Valor |
|---|---|
| Runtime | Node |
| Build Command | `npm install -g pnpm@12.3.4 && pnpm install --frozen-lockfile && pnpm run build` |
| Start Command | `node dist/server.js` |
| Health Check Path | `/health` |
| Environment | `NODE_ENV=production`, `CHARACTER_NAME`, `CUTOFF_DATE`, `GUILDSTATS_BASE_URL`, `TIMEZONE` (opcional) |

Observações:
- **Não** defina `PORT`: o Render injeta essa variável, e o servidor escuta em `0.0.0.0:$PORT`.
- O pnpm é instalado explicitamente em vez de usar Corepack, porque o Corepack que vem em algumas versões do Node 22 falha ao verificar a assinatura das versões novas do pnpm (`Cannot find matching keyid`). Ao atualizar o pnpm, mude a versão em `package.json` (`packageManager`) e no `render.yaml`.
- `NODE_ENV=production` esconde o campo `detail` nas respostas de erro e não afeta o build: o pnpm 12 continua instalando as `devDependencies`, que incluem o TypeScript.
- O GuildStats fica atrás do Cloudflare, que responde 403 para os IPs do Render. Por isso, em produção, `GUILDSTATS_BASE_URL` aponta para um Cloudflare Worker (`worker/guildstats-proxy.js`) que repassa só `GET /include/character/tab.php` para o `guildstats.eu`. Para publicar: Cloudflare → Workers & Pages → Create Worker, cole o arquivo e faça o deploy.
- O start usa `node dist/server.js` diretamente, sem depender do pnpm em runtime.

Depois do deploy: `https://<seu-servico>.onrender.com/docs`.

### Manter acordado (plano free)
No [cron-job.org](https://cron-job.org), crie um job `GET https://<seu-servico>.onrender.com/health` a cada 10 minutos. A aplicação não tem cron interno.
