import assert from 'node:assert/strict'
import { test } from 'node:test'
import { titleCommand } from './logs-terminal'

test('titleCommand sets the tab title and keeps the name inside its quotes', () => {
  assert.equal(titleCommand('logs: starterbyte-db'), "printf '\\033]0;%s\\007' 'logs: starterbyte-db'")
  assert.equal(titleCommand("logs: x'; rm -rf / #"), "printf '\\033]0;%s\\007' 'logs: x rm -rf  '")
})
