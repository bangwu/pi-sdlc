import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import extension from '../extensions/sdlc.ts';
import { loadChange } from '../lib/workflow.mjs';

function harness(t, hasUI = true) {
  const cwd = mkdtempSync(join(tmpdir(), 'pi-sdlc-extension-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd });
  const events = {}, commands = {}, tools = {}, branch = [], messages = [], prompts = [], notices = [];
  const pi = {
    on(name, handler) { events[name] = handler; },
    registerCommand(name, handler) { commands[name] = handler; },
    registerTool(tool) { tools[tool.name] = tool; },
    appendEntry(customType, data) { branch.push({ type: 'custom', customType, data }); },
    sendMessage(message) { messages.push(message); },
    sendUserMessage(prompt) { prompts.push(prompt); },
  };
  const ctx = {
    cwd, hasUI, sessionManager: { getBranch: () => branch },
    waitForIdle: async () => {},
    ui: { setStatus() {}, notify: (message) => notices.push(message), confirm: async () => true },
  };
  extension(pi);
  const run = (args) => commands.sdlc.handler(args, ctx);
  return { cwd, events, commands, tools, branch, messages, prompts, notices, ctx, run };
}

test('extension registers only read-only model tool and drives human-gated commands', async (t) => {
  const h = harness(t);
  assert.deepEqual(Object.keys(h.tools), ['sdlc_status']);
  await h.run('init sample Sample feature');
  await h.run('run plan');
  assert.match(h.prompts[0], /sdlc-plan\/SKILL.md/);
  assert.match(h.events.tool_call({ toolName: 'bash', input: { command: 'touch source.js' } }, h.ctx).reason, /not allowed/);
  await h.run('run design');
  assert.equal(h.prompts.length, 1);
  assert.match(h.notices.at(-1), /Missing or stale/);
  const path = join(h.cwd, 'intent/sample/intent.md');
  writeFileSync(path, readFileSync(path, 'utf8').replace('<!-- sdlc:draft -->', ''));
  await h.run('approve plan Product Owner');
  assert.equal(loadChange(h.cwd, 'sample').approvals.plan.reviewer, 'Product Owner');
  await h.run('run design');
  assert.match(h.prompts.at(-1), /sdlc-design\/SKILL.md/);
  const result = await h.tools.sdlc_status.execute('id', {}, undefined, undefined, h.ctx);
  assert.equal(result.details.id, 'sample');
});

test('headless commands report outcomes but cannot grant approval', async (t) => {
  const h = harness(t, false);
  await h.run('init sample Sample');
  await h.run('approve plan Robot');
  assert.match(h.messages.at(-1).content, /Headless agents cannot approve/);
  assert.deepEqual(loadChange(h.cwd, 'sample').approvals, {});
  await h.run('status');
  assert.match(h.messages.at(-1).content, /sample/);
});

test('active workflow follows session branch and off resets guards', async (t) => {
  const h = harness(t);
  await h.run('init sample Sample');
  const entry = h.branch[0];
  await h.run('off');
  assert.equal(h.events.tool_call({ toolName: 'bash', input: {} }, h.ctx), undefined);
  h.branch.splice(0, h.branch.length, entry);
  h.events.session_tree({}, h.ctx);
  assert.equal(h.events.tool_call({ toolName: 'bash', input: {} }, h.ctx).block, true);
  assert.match(h.events.before_agent_start({}, h.ctx).message.content, /Active SDLC change sample/);
  h.branch.splice(0);
  h.events.session_start({}, h.ctx);
  assert.equal(h.events.before_agent_start({}, h.ctx), undefined);
});

test('canceled UI approval does not mutate audit state', async (t) => {
  const h = harness(t);
  await h.run('init sample Sample');
  const path = join(h.cwd, 'intent/sample/intent.md');
  writeFileSync(path, '# Ready intent\n');
  h.ctx.ui.confirm = async () => false;
  await h.run('approve plan Alice');
  assert.deepEqual(loadChange(h.cwd, 'sample').approvals, {});
});
