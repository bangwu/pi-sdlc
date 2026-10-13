import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DefaultResourceLoader, SettingsManager } from '@earendil-works/pi-coding-agent';
import { packageRoot } from '../lib/workflow.mjs';

test('real pi resource loader discovers the package extension, six skills and three prompts', async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), 'pi-sdlc-package-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const loader = new DefaultResourceLoader({
    cwd, agentDir: join(cwd, 'agent'), settingsManager: SettingsManager.inMemory(),
    noExtensions: true, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
    additionalExtensionPaths: [packageRoot],
  });
  await loader.reload();
  const extensions = loader.getExtensions();
  assert.deepEqual(extensions.errors, []);
  assert.equal(extensions.extensions.length, 1);
  assert.equal(extensions.extensions[0].commands.has('sdlc'), true);
  assert.equal(extensions.extensions[0].tools.has('sdlc_status'), true);
  const skills = loader.getSkills();
  assert.deepEqual(skills.diagnostics, []);
  assert.deepEqual(skills.skills.map((s) => s.name).sort(), [
    'sdlc-build', 'sdlc-deploy', 'sdlc-design', 'sdlc-maintain', 'sdlc-plan', 'sdlc-test',
  ]);
  const prompts = loader.getPrompts();
  assert.deepEqual(prompts.diagnostics, []);
  assert.deepEqual(prompts.prompts.map((p) => p.name).sort(), ['sdlc-capture', 'sdlc-context', 'sdlc-review']);
});
