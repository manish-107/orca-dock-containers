import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DANGLING_LABEL, fullRepoName, groupByRepo, isImageRef, splitRef, timeAgo, toImageSummary } from './model'

test('splitRef keeps a registry port in the repo', () => {
  assert.deepEqual(splitRef('redis:7.4-alpine'), { repo: 'redis', tag: '7.4-alpine' })
  assert.deepEqual(splitRef('localhost:5000/app'), { repo: 'localhost:5000/app', tag: 'latest' })
  assert.deepEqual(splitRef('localhost:5000/app:1.0'), { repo: 'localhost:5000/app', tag: '1.0' })
})

test('fullRepoName adds docker.io the way Cursor shows it', () => {
  assert.equal(fullRepoName('redis'), 'docker.io/library/redis')
  assert.equal(fullRepoName('minio/minio'), 'docker.io/minio/minio')
  assert.equal(fullRepoName('ghcr.io/chartdb/chartdb'), 'ghcr.io/chartdb/chartdb')
  assert.equal(fullRepoName('localhost:5000/app'), 'localhost:5000/app')
})

test('groupByRepo groups tags, newest first, untagged last', () => {
  const images = [
    toImageSummary({ Id: 'sha256:' + '1'.repeat(64), RepoTags: ['<none>:<none>'], Created: 10 }),
    toImageSummary({ Id: 'sha256:' + '2'.repeat(64), RepoTags: ['postgres:15'], Created: 100 }),
    toImageSummary({ Id: 'sha256:' + '3'.repeat(64), RepoTags: ['postgres:16'], Created: 200 }),
    toImageSummary({ Id: 'sha256:' + '4'.repeat(64), RepoTags: ['minio/mc:RELEASE.2025'], Created: 50 })
  ]
  const repos = groupByRepo(images)
  assert.deepEqual(repos.map((r) => r.label), ['docker.io/library/postgres', 'docker.io/minio/mc', DANGLING_LABEL])
  assert.deepEqual(repos[0].tags.map((t) => t.label), ['16', '15'])
  assert.equal(repos[2].tags[0].label, '111111111111')
})

test('timeAgo', () => {
  assert.equal(timeAgo(0, 30), 'just now')
  assert.equal(timeAgo(0, 2 * 3600), '2 hours ago')
  assert.equal(timeAgo(0, 4 * 365 * 24 * 3600), '4 years ago')
})

test('isImageRef refuses path tricks and shell characters', () => {
  assert.equal(isImageRef('ghcr.io/chartdb/chartdb:1.19.0'), true)
  assert.equal(isImageRef('sha256:' + 'a'.repeat(64)), true)
  assert.equal(isImageRef('../containers/x'), false)
  assert.equal(isImageRef('redis?force=1'), false)
  assert.equal(isImageRef('redis 7'), false)
})
