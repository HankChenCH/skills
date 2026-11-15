import { test } from 'node:test';
import assert from 'node:assert/strict';

import { AGENT_DIRS } from '../../src/agent-dirs.js';

test('agent 目录清单为 20+ 量级', () => {
  assert.ok(AGENT_DIRS.length >= 20, `清单应 ≥20 项，实际 ${AGENT_DIRS.length}`);
});

test('清单含主流程 agent（.claude/.zcode），无重复项', () => {
  for (const must of ['.claude', '.zcode']) {
    assert.ok(AGENT_DIRS.includes(must), `清单应含 ${must}`);
  }
  assert.equal(new Set(AGENT_DIRS).size, AGENT_DIRS.length);
});
