const iso = (description: string, example: string) => ({ type: 'string', format: 'date-time', description, example })
const nullableInt = (description: string) => ({ type: 'integer', nullable: true, minimum: 0, description })

const lastDeathExample = {
  date: '2026-09-21T12:42:00-03:00',
  level: 973,
  killer: 'dreadful harvester',
  killers: ['dreadful harvester'],
  pvp: false,
}
const pvpDeathExample = {
  date: '2026-09-18T17:47:00-03:00',
  level: 975,
  killer: 'Chubiirou Marea, Ichgahal',
  killers: ['Chubiirou Marea', 'Ichgahal'],
  pvp: true,
}
const pastRecordExample = {
  days: 2, hours: 1, minutes: 6,
  from: '2026-09-16T16:41:00-03:00', to: '2026-09-18T17:47:00-03:00', ongoing: false,
}
const ongoingRecordExample = {
  days: 3, hours: 21, minutes: 18,
  from: '2026-09-21T12:42:00-03:00', to: null, ongoing: true,
}
const emptyRecordExample = { days: null, hours: null, minutes: null, from: null, to: null, ongoing: false }
const cutoff = '2026-09-14T11:51:00-03:00'

const json = (schema: object, examples: Record<string, { summary: string; value: unknown }>) => ({
  'application/json': { schema, examples },
})

const errorResponses = {
  '404': { $ref: '#/components/responses/NotFound' },
  '500': { $ref: '#/components/responses/InternalError' },
  '502': { $ref: '#/components/responses/BadGateway' },
}

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Chubiirou Tibia API',
    version: '1.0.0',
    description: [
      'Estatísticas de mortes de um personagem de Tibia, calculadas em tempo real a partir do HTML do GuildStats.',
      '',
      '- Sem banco de dados, sem cache e sem estado: cada chamada consulta o GuildStats.',
      '- Só entram mortes com `date >= cutoff` (a morte do cutoff é incluída).',
      '- Datas em ISO 8601 com o offset do fuso configurado (padrão `America/Sao_Paulo`, `-03:00`).',
      '- `days`, `hours` e `minutes` são sempre inteiros **arredondados para baixo**.',
      '- Qualquer path que não esteja listado aqui responde **404** `{ "error": "Not found" }`.',
    ].join('\n'),
  },
  tags: [
    { name: 'Monitoring', description: 'Verificação de disponibilidade' },
    { name: 'Deaths', description: 'Mortes e estatísticas (consultam o GuildStats)' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Monitoring'],
        summary: 'Health check',
        description: 'Resposta imediata, **sem** acessar o GuildStats. Pensado para o cron-job.org.',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'API no ar.',
            content: json({ $ref: '#/components/schemas/Health' }, { ok: { summary: 'API no ar', value: { status: 'ok' } } }),
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/stats': {
      get: {
        tags: ['Deaths'],
        summary: 'Estatísticas completas',
        description:
          'Total de mortes desde o cutoff, última morte, tempo sem morrer e recorde. ' +
          'O recorde é o maior período sem morrer, contando os intervalos entre mortes consecutivas **e** a sequência atual (última morte → agora).',
        operationId: 'getStats',
        responses: {
          '200': {
            description: 'Estatísticas calculadas.',
            content: json({ $ref: '#/components/schemas/Stats' }, {
              pastRecord: {
                summary: 'Recorde é um intervalo entre duas mortes',
                value: {
                  character: 'Chubiirou Marea', cutoff, totalDeaths: 10, lastDeath: lastDeathExample,
                  daysWithoutDeath: 2, timeWithoutDeath: { days: 2, hours: 0, minutes: 10 }, record: pastRecordExample,
                },
              },
              ongoingRecord: {
                summary: 'Sequência atual é o recorde (ongoing = true)',
                value: {
                  character: 'Chubiirou Marea', cutoff, totalDeaths: 10, lastDeath: lastDeathExample,
                  daysWithoutDeath: 3, timeWithoutDeath: { days: 3, hours: 21, minutes: 18 }, record: ongoingRecordExample,
                },
              },
              noDeaths: {
                summary: 'Nenhuma morte desde o cutoff',
                value: {
                  character: 'Chubiirou Marea', cutoff, totalDeaths: 0, lastDeath: null,
                  daysWithoutDeath: null, timeWithoutDeath: null, record: null,
                },
              },
            }),
          },
          ...errorResponses,
        },
      },
    },
    '/deaths': {
      get: {
        tags: ['Deaths'],
        summary: 'Mortes do período',
        description: 'Mortes com `date >= cutoff`, da mais recente para a mais antiga. Útil para debug.',
        operationId: 'getDeaths',
        responses: {
          '200': {
            description: 'Lista de mortes.',
            content: json({ $ref: '#/components/schemas/DeathList' }, {
              withDeaths: {
                summary: 'Mortes encontradas (inclui uma PvP)',
                value: { character: 'Chubiirou Marea', cutoff, total: 2, deaths: [lastDeathExample, pvpDeathExample] },
              },
              empty: {
                summary: 'Nenhuma morte desde o cutoff',
                value: { character: 'Chubiirou Marea', cutoff, total: 0, deaths: [] },
              },
            }),
          },
          ...errorResponses,
        },
      },
    },
    '/record': {
      get: {
        tags: ['Deaths'],
        summary: 'Recorde de tempo sem morrer',
        description:
          'Só o recorde, com formato sempre igual (pensado para o StreamElements). ' +
          'Quando a sequência atual é o recorde, `ongoing` é `true`, `to` é `null` e a duração vai até o momento da requisição. ' +
          'Sem mortes no período, todos os campos vêm `null` e `ongoing` vem `false`.',
        operationId: 'getRecord',
        responses: {
          '200': {
            description: 'Recorde calculado.',
            content: json({ $ref: '#/components/schemas/Record' }, {
              pastRecord: { summary: 'Intervalo entre duas mortes', value: pastRecordExample },
              ongoingRecord: { summary: 'Sequência atual (ainda em andamento)', value: ongoingRecordExample },
              noDeaths: { summary: 'Nenhuma morte desde o cutoff', value: emptyRecordExample },
            }),
          },
          ...errorResponses,
        },
      },
    },
    '/ferumbrinhas': {
      get: {
        tags: ['StreamElements'],
        summary: 'Frase pronta para o comando !ferumbrinhas',
        description:
          'Texto puro para usar com `$(customapi https://<host>/ferumbrinhas)` no StreamElements. ' +
          'Em caso de falha, responde uma mensagem amigável em texto em vez de JSON, para não sujar o chat.',
        operationId: 'getFerumbrinhas',
        responses: {
          '200': {
            description: 'Frase com dias sem morrer, última morte (se houver), recorde e total de mortes.',
            content: {
              'text/plain': {
                schema: { type: 'string' },
                example:
                  'Estamos caçando há 2 dias sem acidentes de trabalho. A última morte foi em 21/09, às 12:42, para dreadful harvester. Nosso recorde atual é de 2 dias. No total de 10 mortes atualizadas pelo GuildStats.',
              },
            },
          },
          '502': {
            description: 'GuildStats indisponível.',
            content: {
              'text/plain': {
                schema: { type: 'string' },
                example: 'Não consegui consultar o GuildStats agora, tenta de novo daqui a pouco.',
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Health: {
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', enum: ['ok'] } },
      },
      Death: {
        type: 'object',
        required: ['date', 'level', 'killer', 'killers', 'pvp'],
        properties: {
          date: iso('Data/hora da morte', lastDeathExample.date),
          level: { type: 'integer', example: 973, description: 'Nível no momento da morte' },
          killer: { type: 'string', example: 'dreadful harvester', description: 'Matadores separados por ", "' },
          killers: { type: 'array', items: { type: 'string' }, example: ['dreadful harvester'] },
          pvp: { type: 'boolean', description: 'true quando algum jogador participou da morte' },
        },
      },
      Duration: {
        type: 'object',
        required: ['days', 'hours', 'minutes'],
        properties: {
          days: { type: 'integer', minimum: 0, description: 'Dias inteiros' },
          hours: { type: 'integer', minimum: 0, maximum: 23, description: 'Horas restantes' },
          minutes: { type: 'integer', minimum: 0, maximum: 59, description: 'Minutos restantes' },
        },
      },
      Record: {
        type: 'object',
        required: ['days', 'hours', 'minutes', 'from', 'to', 'ongoing'],
        properties: {
          days: nullableInt('Dias inteiros do recorde'),
          hours: nullableInt('Horas restantes (0-23)'),
          minutes: nullableInt('Minutos restantes (0-59)'),
          from: { ...iso('Morte que iniciou a sequência', pastRecordExample.from), nullable: true },
          to: { ...iso('Morte que encerrou a sequência; null se ainda está em andamento', pastRecordExample.to), nullable: true },
          ongoing: { type: 'boolean', description: 'true quando o recorde é a sequência atual' },
        },
      },
      Stats: {
        type: 'object',
        required: ['character', 'cutoff', 'totalDeaths', 'lastDeath', 'daysWithoutDeath', 'timeWithoutDeath', 'record'],
        properties: {
          character: { type: 'string', example: 'Chubiirou Marea' },
          cutoff: iso('Início do período analisado (inclusivo)', cutoff),
          totalDeaths: { type: 'integer', minimum: 0 },
          lastDeath: { allOf: [{ $ref: '#/components/schemas/Death' }], nullable: true },
          daysWithoutDeath: nullableInt('Dias inteiros desde a última morte (arredondados para baixo)'),
          timeWithoutDeath: { allOf: [{ $ref: '#/components/schemas/Duration' }], nullable: true },
          record: { allOf: [{ $ref: '#/components/schemas/Record' }], nullable: true },
        },
      },
      DeathList: {
        type: 'object',
        required: ['character', 'cutoff', 'total', 'deaths'],
        properties: {
          character: { type: 'string', example: 'Chubiirou Marea' },
          cutoff: iso('Início do período analisado (inclusivo)', cutoff),
          total: { type: 'integer', minimum: 0 },
          deaths: { type: 'array', items: { $ref: '#/components/schemas/Death' } },
        },
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
          detail: { type: 'string', description: 'Só aparece fora de produção (NODE_ENV != production)' },
        },
      },
    },
    responses: {
      NotFound: {
        description: 'Path inexistente (ex.: erro de digitação na URL).',
        content: json({ $ref: '#/components/schemas/Error' }, {
          notFound: { summary: 'Rota inexistente', value: { error: 'Not found' } },
        }),
      },
      InternalError: {
        description: 'Erro inesperado no servidor. O stack trace fica só nos logs.',
        content: json({ $ref: '#/components/schemas/Error' }, {
          production: { summary: 'Produção', value: { error: 'Internal server error' } },
          development: {
            summary: 'Desenvolvimento (com detail)',
            value: { error: 'Internal server error', detail: "TypeError: Cannot read properties of undefined (reading 'date')" },
          },
        }),
      },
      BadGateway: {
        description: 'GuildStats indisponível, com timeout, respondendo com status de erro ou com HTML inesperado.',
        content: json({ $ref: '#/components/schemas/Error' }, {
          production: { summary: 'Produção', value: { error: 'Failed to fetch GuildStats' } },
          unreachable: {
            summary: 'Desenvolvimento: GuildStats inacessível ou timeout',
            value: {
              error: 'Failed to fetch GuildStats',
              detail: 'Request to https://guildstats.eu/include/character/tab.php?nick=Chubiirou+Marea&tab=deaths failed: The operation was aborted due to timeout',
            },
          },
          httpError: {
            summary: 'Desenvolvimento: GuildStats respondeu com erro HTTP',
            value: {
              error: 'Failed to fetch GuildStats',
              detail: 'GuildStats responded 503 for https://guildstats.eu/include/character/tab.php?nick=Chubiirou+Marea&tab=deaths',
            },
          },
          invalidHtml: {
            summary: 'Desenvolvimento: HTML sem a tabela de mortes',
            value: { error: 'Failed to fetch GuildStats', detail: 'Deaths table not found in GuildStats HTML' },
          },
        }),
      },
    },
  },
}
