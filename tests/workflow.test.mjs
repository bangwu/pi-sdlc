import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { approve, approvalValid, assertPrerequisites, codeFingerprint, guardTool, initChange, loadChange, outputs, phasePrompt, prepareApproval, safePath, status } from '../lib/workflow.mjs';

function repo(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'pi-sdlc-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd });
  writeFileSync(join(cwd, '.gitignore'), '.sdlc/mutation.lock/\nnode_modules/\n');
  writeFileSync(join(cwd, 'app.js'), 'export const result = 1;\n');
  initChange(cwd, 'change-1', 'Test change');
  return cwd;
}
function ready(cwd, phase) {
  for (const file of outputs[phase]) {
    const path = join(cwd, 'intent/change-1', file);
    writeFileSync(path, readFileSync(path, 'utf8').replace('<!-- sdlc:draft -->', '') + '\nReviewed evidence.\n');
  }
}
function accepted(cwd, through = 'deploy') {
  for (const phase of ['plan', 'design', 'build', 'test', 'deploy', 'maintain']) {
    ready(cwd, phase); approve(cwd, 'change-1', phase, 'Human reviewer');
    if (phase === through) break;
  }
}

test('initialization creates all templates and refuses overwrite/traversal', (t) => {
  const cwd = repo(t);
  assert.equal(loadChange(cwd, 'change-1').title, 'Test change');
  assert.equal(status(cwd, 'change-1').phases.length, 6);
  assert.throws(() => initChange(cwd, 'change-1', 'overwrite'), /already exists/);
  assert.throws(() => initChange(cwd, '../escape', 'bad'), /Change ID/);
  assert.throws(() => initChange(cwd, 'good', ''), /title/);
  assert.throws(() => phasePrompt(cwd, 'change-1', 'unknown'), /Unknown phase/);
});

test('human approval requires complete artifacts and upstream approval', (t) => {
  const cwd = repo(t);
  assert.throws(() => approve(cwd, 'change-1', 'plan', 'Alice'), /draft/);
  ready(cwd, 'design');
  assert.throws(() => approve(cwd, 'change-1', 'design', 'Alice'), /Missing or stale/);
  ready(cwd, 'plan');
  assert.throws(() => approve(cwd, 'change-1', 'plan', ''), /reviewer/);
  approve(cwd, 'change-1', 'plan', 'Alice');
  assert.equal(approvalValid(cwd, 'change-1', 'plan'), true);
  assert.throws(() => assertPrerequisites(cwd, 'change-1', 'implement'), /design, build/);
  assert.throws(() => approve(cwd, 'change-1', 'implement', 'Alice'), /not self-approved/);
});

test('artifact chain invalidates downstream approvals without discarding audit history', (t) => {
  const cwd = repo(t); accepted(cwd, 'maintain');
  assert.equal(approvalValid(cwd, 'change-1', 'maintain'), true);
  writeFileSync(join(cwd, 'intent/change-1/spec.md'), '# changed spec\n');
  assert.equal(approvalValid(cwd, 'change-1', 'plan'), true);
  for (const phase of ['design', 'build', 'test', 'deploy', 'maintain']) assert.equal(approvalValid(cwd, 'change-1', phase), false);
  assert.equal(loadChange(cwd, 'change-1').history.length, 6);
});

test('verification/release approval binds tracked and untracked source content', (t) => {
  const cwd = repo(t); accepted(cwd);
  assert.equal(approvalValid(cwd, 'change-1', 'deploy'), true);
  const before = codeFingerprint(cwd);
  writeFileSync(join(cwd, 'new.js'), 'new code');
  assert.notEqual(codeFingerprint(cwd), before);
  assert.equal(approvalValid(cwd, 'change-1', 'test'), false);
  assert.equal(approvalValid(cwd, 'change-1', 'deploy'), false);
  assert.equal(approvalValid(cwd, 'change-1', 'build'), true);
});

test('approval checks the snapshot seen before human confirmation', (t) => {
  const cwd = repo(t); ready(cwd, 'plan');
  const preview = prepareApproval(cwd, 'change-1', 'plan');
  writeFileSync(join(cwd, 'intent/change-1/intent.md'), '# edited during dialog');
  assert.throws(() => approve(cwd, 'change-1', 'plan', 'Alice', preview), /changed during confirmation/);
});

test('planning guards block shell, source changes, MCP and state mutation', (t) => {
  const cwd = repo(t);
  const active = { id: 'change-1', phase: 'plan' };
  assert.equal(guardTool(cwd, active, 'read', { path: 'app.js' }), undefined);
  assert.equal(guardTool(cwd, active, 'write', { path: 'intent/change-1/intent.md' }), undefined);
  assert.match(guardTool(cwd, active, 'edit', { path: 'app.js' }), /can edit only/);
  assert.match(guardTool(cwd, active, 'bash', { command: 'echo test' }), /not allowed/);
  assert.match(guardTool(cwd, active, 'mcp__deploy', {}), /Unknown and MCP/);
  assert.match(guardTool(cwd, active, 'write', { path: '.sdlc/changes/change-1.json' }), /human-command-owned/);
  assert.equal(guardTool(cwd, undefined, 'bash', {}), undefined);
});

test('implementation needs approved plan and protects artifacts/direct metadata', (t) => {
  const cwd = repo(t); const active = { id: 'change-1', phase: 'implement' };
  assert.throws(() => guardTool(cwd, active, 'write', { path: 'app.js' }), /Missing or stale/);
  accepted(cwd, 'build');
  assert.equal(guardTool(cwd, active, 'edit', { path: 'app.js' }), undefined);
  assert.equal(guardTool(cwd, active, 'bash', { command: 'npm test' }), undefined);
  assert.match(guardTool(cwd, active, 'bash', { command: 'git push origin main' }), /external human/);
  assert.match(guardTool(cwd, active, 'bash', { command: 'kubectl apply -f prod.yml' }), /external human/);
  assert.match(guardTool(cwd, active, 'edit', { path: 'intent/change-1/plan.md' }), /authoring phase/);
  assert.match(guardTool(cwd, active, 'write', { path: '.git/config' }), /metadata/);
});

test('stale prerequisites stop design writes already in an active phase', (t) => {
  const cwd = repo(t); accepted(cwd, 'plan');
  writeFileSync(join(cwd, 'intent/change-1/intent.md'), '# changed');
  assert.throws(() => guardTool(cwd, { id: 'change-1', phase: 'design' }, 'write', { path: 'intent/change-1/spec.md' }), /Missing or stale/);
});

test('path guards reject traversal, absolute escape and symlink ancestors', (t) => {
  const cwd = repo(t);
  assert.throws(() => safePath(cwd, '../outside'), /escapes/);
  assert.throws(() => safePath(cwd, '/tmp/outside'), /escapes/);
  symlinkSync(tmpdir(), join(cwd, 'link'));
  assert.throws(() => safePath(cwd, 'link/not-created-yet'), /Symlink/);
  symlinkSync(join(tmpdir(), `missing-sdlc-${process.pid}`), join(cwd, 'dangling'));
  assert.throws(() => safePath(cwd, 'dangling'), /Symlink/);
});

test('cross-process mutation lock fails without overwriting state', (t) => {
  const cwd = repo(t); ready(cwd, 'plan');
  mkdirSync(join(cwd, '.sdlc/mutation.lock'));
  assert.throws(() => approve(cwd, 'change-1', 'plan', 'Alice'), /Another SDLC mutation/);
  assert.equal(loadChange(cwd, 'change-1').history.length, 0);
});
