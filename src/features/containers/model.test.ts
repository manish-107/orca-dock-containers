import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  actionsFor,
  composeArgs,
  groupByProject,
  isContainerId,
  isProjectName,
  NO_PROJECT_LABEL,
  toneOf,
  toSummary
} from './model'
import type { ContainerSummary } from './types'

const ID = 'a'.repeat(64)

function container(overrides: Partial<ContainerSummary>): ContainerSummary {
  return { id: ID, name: 'app', image: 'redis:7', state: 'running', status: 'Up 5 hours', project: null, ...overrides }
}

test('toSummary strips the leading slash and reads the compose project', () => {
  const summary = toSummary({
    Id: ID,
    Names: ['/starterbyte-redis'],
    Image: 'redis:7.4-alpine',
    State: 'running',
    Status: 'Up 5 hours (healthy)',
    Labels: { 'com.docker.compose.project': 'local-dev' }
  })
  assert.equal(summary.name, 'starterbyte-redis')
  assert.equal(summary.project, 'local-dev')
})

test('toSummary falls back to the short id and no project', () => {
  const summary = toSummary({ Id: ID, Names: null, Image: 'x', State: 'exited', Status: 'Exited (0)', Labels: null })
  assert.equal(summary.name, ID.slice(0, 12))
  assert.equal(summary.project, null)
})

test('groupByProject sorts projects A-Z and puts lone containers last', () => {
  const groups = groupByProject([
    container({ project: null, image: 'chartdb' }),
    container({ project: 'metabase', image: 'postgres:15' }),
    container({ project: 'local-dev', image: 'supabase/gotrue' }),
    container({ project: 'local-dev', image: 'kong:2.8.1' })
  ])
  assert.deepEqual(groups.map((g) => g.label), ['local-dev', 'metabase', NO_PROJECT_LABEL])
  assert.deepEqual(groups[0].containers.map((c) => c.image), ['kong:2.8.1', 'supabase/gotrue'])
})

test('tone and actions follow the state', () => {
  assert.equal(toneOf(container({ state: 'running', status: 'Up 1 hour (healthy)' })), 'ok')
  assert.equal(toneOf(container({ state: 'running', status: 'Up 1 hour (unhealthy)' })), 'warn')
  assert.equal(toneOf(container({ state: 'exited' })), 'bad')
  assert.deepEqual(actionsFor(container({ state: 'running' })), ['stop', 'restart'])
  assert.deepEqual(actionsFor(container({ state: 'exited' })), ['start'])
})

test('groups carry their compose project; lone containers have none', () => {
  const groups = groupByProject([container({ project: 'local-dev' }), container({ project: null })])
  assert.deepEqual(groups.map((g) => g.project), ['local-dev', null])
})

test('compose commands ignore any compose file in the current folder', () => {
  assert.deepEqual(composeArgs('local-dev', 'down'), ['compose', '--project-directory', '/', '-p', 'local-dev', 'down'])
})

test('isProjectName accepts compose names only', () => {
  assert.equal(isProjectName('local-dev'), true)
  assert.equal(isProjectName('my_app2'), true)
  assert.equal(isProjectName('Local Dev'), false)
  assert.equal(isProjectName('x; rm -rf /'), false)
  assert.equal(isProjectName('-p'), false)
})

test('isContainerId accepts hex ids only', () => {
  assert.equal(isContainerId(ID), true)
  assert.equal(isContainerId('abc123def456'), true)
  assert.equal(isContainerId('../../etc'), false)
  assert.equal(isContainerId('abc; rm -rf /'), false)
})
