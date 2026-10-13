import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const packageRoot = fileURLToPath(new URL('../', import.meta.url));
export const phases = ['plan', 'design', 'build', 'implement', 'test', 'deploy', 'maintain'];
export const outputs = {
  plan: ['intent.md'], design: ['spec.md'], build: ['plan.md'], implement: [],
  test: ['verification.md'], deploy: ['review.md', 'release.md'], maintain: ['incident.md'],
};
export const prerequisites = {
  plan: [], design: ['plan'], build: ['plan', 'design'],
  implement: ['plan', 'design', 'build'], test: ['plan', 'design', 'build'],
  deploy: ['plan', 'design', 'build', 'test'], maintain: ['plan', 'design', 'build', 'test', 'deploy'],
};
const hash = (data) => createHash('sha256').update(data).digest('hex');
export function validateId(id) {
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(id)) {
    throw new Error('Change ID must be 1–63 lowercase letters, numbers or hyphens; start with a letter/number.');
  }
  return id;
}
export function validatePhase(phase) {
  if (!phases.includes(phase)) throw new Error(`Unknown phase: ${phase}. Use ${phases.join(', ')}.`);
  return phase;
}

// Reject traversal and existing symlink ancestors, including an as-yet absent leaf.
export function safePath(cwd, path) {
  const root = realpathSync(cwd);
  const target = resolve(root, path);
  const rel = relative(root, target);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error('Path escapes project.');
  let current = root;
  for (const part of rel.split(sep).filter(Boolean)) {
    current = join(current, part);
    if (lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error(`Symlink not allowed: ${current}`);
  }
  return target;
}
export function changeDir(cwd, id) { return safePath(cwd, `intent/${validateId(id)}`); }
function statePath(cwd, id) { return safePath(cwd, `.sdlc/changes/${validateId(id)}.json`); }
function atomicWrite(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  try { writeFileSync(tmp, text, { flag: 'wx' }); renameSync(tmp, path); }
  finally { rmSync(tmp, { force: true }); }
}
function mutate(cwd, fn) {
  const folder = safePath(cwd, '.sdlc');
  mkdirSync(folder, { recursive: true });
  const lock = join(folder, 'mutation.lock');
  try { mkdirSync(lock); } catch (e) {
    if (e.code === 'EEXIST') throw new Error('Another SDLC mutation is running. Retry; remove .sdlc/mutation.lock only if its owner has stopped.');
    throw e;
  }
  try { return fn(); } finally { rmSync(lock, { recursive: true, force: true }); }
}
export function initChange(cwd, id, title) {
  validateId(id);
  if (!title?.trim()) throw new Error('A change title is required.');
  return mutate(cwd, () => {
    const path = statePath(cwd, id);
    const folder = changeDir(cwd, id);
    if (existsSync(path) || existsSync(folder)) throw new Error(`Change ${id} already exists; use /sdlc use ${id}.`);
    mkdirSync(folder, { recursive: true });
    for (const file of Object.values(outputs).flat()) {
      const template = readFileSync(join(packageRoot, 'templates', file), 'utf8');
      writeFileSync(join(folder, file), template.replaceAll('{{title}}', title).replaceAll('{{id}}', id), { flag: 'wx' });
    }
    const state = { version: 1, id, title, createdAt: new Date().toISOString(), approvals: {}, history: [] };
    atomicWrite(path, `${JSON.stringify(state, null, 2)}\n`);
    return state;
  });
}
export function loadChange(cwd, id) {
  const state = JSON.parse(readFileSync(statePath(cwd, id), 'utf8'));
  if (state.version !== 1 || state.id !== id || !state.approvals || !Array.isArray(state.history)) throw new Error('Invalid SDLC state.');
  return state;
}
function artifactHashes(cwd, id, phase, requireReady = false) {
  const result = {};
  for (const file of outputs[phase]) {
    const text = readFileSync(safePath(cwd, `intent/${id}/${file}`), 'utf8');
    if (requireReady && (!text.trim() || text.includes('<!-- sdlc:draft -->'))) {
      throw new Error(`${file} is still a draft. Fill it and remove <!-- sdlc:draft --> before approval.`);
    }
    result[file] = hash(text);
  }
  return result;
}
export function codeFingerprint(cwd) {
  // Content, names and deletion state, including untracked files not ignored by git.
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    .split('\0').filter(Boolean).filter((f) => !f.startsWith('intent/') && !f.startsWith('.sdlc/'));
  const digest = createHash('sha256');
  for (const file of [...new Set(files)].sort()) {
    const path = resolve(cwd, file);
    digest.update(file).update('\0');
    if (!existsSync(path)) { digest.update('deleted\0'); continue; }
    const stat = lstatSync(path);
    digest.update(String(stat.mode)).update('\0');
    if (stat.isSymbolicLink()) throw new Error(`Cannot fingerprint symlink: ${file}; use regular source files for gated verification.`);
    if (stat.isFile()) digest.update(readFileSync(path));
    digest.update('\0');
  }
  return digest.digest('hex');
}
function snapshot(cwd, id, phase, ready = false) {
  const artifacts = artifactHashes(cwd, id, phase, ready);
  for (const upstream of prerequisites[phase]) Object.assign(artifacts, artifactHashes(cwd, id, upstream));
  return { artifacts, ...(phase === 'test' || phase === 'deploy' ? { code: codeFingerprint(cwd) } : {}) };
}
export function approvalValid(cwd, id, phase, state = loadChange(cwd, id)) {
  const approval = state.approvals[phase];
  if (!approval) return false;
  try {
    if (!prerequisites[phase].every((p) => approvalValid(cwd, id, p, state))) return false;
    return JSON.stringify(approval.snapshot) === JSON.stringify(snapshot(cwd, id, phase));
  } catch { return false; }
}
export function assertPrerequisites(cwd, id, phase) {
  validatePhase(phase);
  const state = loadChange(cwd, id);
  const missing = prerequisites[phase].filter((p) => !approvalValid(cwd, id, p, state));
  if (missing.length) throw new Error(`Missing or stale human approval: ${missing.join(', ')}. Review artifacts and use /sdlc approve <phase> <reviewer>.`);
  return state;
}
export function prepareApproval(cwd, id, phase) {
  assertPrerequisites(cwd, id, phase);
  return snapshot(cwd, id, phase, true);
}
/** @param {ReturnType<typeof snapshot> | null} [expected] */
export function approve(cwd, id, phase, reviewer, expected = null) {
  validatePhase(phase);
  if (phase === 'implement') throw new Error('Implementation is authorized by approval of build/plan.md, not self-approved.');
  if (!reviewer?.trim()) throw new Error('Name the accountable human reviewer.');
  return mutate(cwd, () => {
    const state = assertPrerequisites(cwd, id, phase);
    const current = snapshot(cwd, id, phase, true);
    if (expected && JSON.stringify(expected) !== JSON.stringify(current)) throw new Error('Artifacts/source changed during confirmation. Review and approve again.');
    const record = { phase, reviewer: reviewer.trim(), at: new Date().toISOString(), snapshot: current };
    state.approvals[phase] = record;
    state.history.push(record);
    atomicWrite(statePath(cwd, id), `${JSON.stringify(state, null, 2)}\n`);
    return record;
  });
}
export function status(cwd, id) {
  const state = loadChange(cwd, id);
  return { id, title: state.title, directory: changeDir(cwd, id), phases: phases.filter((p) => p !== 'implement').map((phase) => ({
    phase, artifacts: outputs[phase], approved: approvalValid(cwd, id, phase, state),
    reviewer: state.approvals[phase]?.reviewer ?? null,
  })) };
}
export function phasePrompt(cwd, id, phase) {
  assertPrerequisites(cwd, id, phase);
  const skill = phase === 'implement' ? 'build' : phase;
  return `Execute pi-sdlc phase ${phase} for change ${id}.\nRead ${join(packageRoot, `skills/sdlc-${skill}/SKILL.md`)} first.\nRead the shared contract at ${join(packageRoot, 'skills/CONTRACT.md')}.\nChange artifacts: ${changeDir(cwd, id)}.\n${phase === 'implement' ? 'Implement only the approved plan.md. Run the feedback loop and report evidence.' : `Produce ${outputs[phase].join(', ')}. Do not self-approve.`}\nRead project AGENTS.md, REVIEW.md and relevant organization skills. Do not invent policies, metrics, tool output or approvals.\nState and approval files under .sdlc are human-command-owned. Do not modify them.\nNo commit, push, merge or production action without explicit user/platform authorization.`;
}

// Convenience guardrails, not a sandbox or a shell parser.
export function guardTool(cwd, active, toolName, input) {
  if (!active) return undefined;
  const { id, phase } = active;
  validatePhase(phase);
  loadChange(cwd, id); // fail closed on broken state
  if (['read', 'grep', 'find', 'ls', 'sdlc_status'].includes(toolName)) return undefined;
  if (toolName === 'write' || toolName === 'edit') {
    assertPrerequisites(cwd, id, phase);
    const path = safePath(cwd, input.path ?? '');
    const rel = relative(realpathSync(cwd), path).split(sep).join('/');
    if (rel === '.sdlc' || rel.startsWith('.sdlc/')) return 'SDLC approval/state files are human-command-owned.';
    if (rel === '.git' || rel.startsWith('.git/')) return 'Direct git metadata edits are not allowed.';
    if (['plan', 'design', 'build', 'deploy', 'maintain'].includes(phase)) {
      const allowed = outputs[phase].map((file) => `intent/${id}/${file}`);
      if (!allowed.includes(rel)) return `Phase ${phase} can edit only ${allowed.join(', ')}. Use read/grep/find/ls to inspect the repository.`;
    } else {
      assertPrerequisites(cwd, id, phase);
      if (rel.startsWith('intent/')) {
        if (phase !== 'test' || rel !== `intent/${id}/verification.md`) return 'Change approved artifacts in their authoring phase, then obtain renewed approval.';
      }
    }
    return undefined;
  }
  if (['implement', 'test'].includes(phase) && ['bash', 'powershell'].includes(toolName)) {
    assertPrerequisites(cwd, id, phase);
    // Obvious dangerous operations are stopped; wrappers/aliases cannot be analyzed safely.
    const command = String(input.command ?? '');
    if (/(?:\b(?:deploy|rollback|terraform|kubectl|helm)\b|\bgit\s+(?:push|commit|merge)\b|\.sdlc[\/\\])/.test(command)) {
      return 'Deploy/rollback, git publication and SDLC state mutation require an external human/platform gate; run them outside this agent workflow.';
    }
    return undefined;
  }
  return `Tool ${toolName} is not allowed in SDLC phase ${phase}. Planning/review phases allow read/grep/find/ls and scoped artifact edits only; implement/test allow local shell. Unknown and MCP tools fail closed.`;
}
