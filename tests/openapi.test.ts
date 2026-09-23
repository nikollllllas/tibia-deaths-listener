import { describe, expect, it } from 'vitest'
import { openApiSpec } from '../src/openapi.js'

const refs = (node: unknown): string[] =>
  node && typeof node === 'object'
    ? Object.entries(node).flatMap(([k, v]) => (k === '$ref' && typeof v === 'string' ? [v] : refs(v)))
    : []

describe('openApiSpec', () => {
  it('documents every route', () => {
    expect(Object.keys(openApiSpec.paths).sort()).toEqual(['/deaths', '/health', '/record', '/stats'])
  })

  it('has only resolvable $refs', () => {
    for (const ref of refs(openApiSpec)) {
      const target = ref.replace('#/', '').split('/').reduce<unknown>((o, key) => (o as Record<string, unknown>)?.[key], openApiSpec)
      expect(target, ref).toBeDefined()
    }
  })

  it('documents 200/404/500/502 on every GuildStats-backed route', () => {
    for (const path of ['/stats', '/deaths', '/record'] as const) {
      expect(Object.keys(openApiSpec.paths[path].get.responses).sort(), path).toEqual(['200', '404', '500', '502'])
    }
  })
})
