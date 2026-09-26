import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const installer = resolve('codex-skill/adaptive-course-teacher/scripts/install-image-preview.cjs');
const root = mkdtempSync(join(tmpdir(), 'adaptive-preview-test-'));
const run = (...args: string[]) => spawnSync(process.execPath, [installer, ...args], { encoding: 'utf8' });

test('installs four offline files and keeps HTML untouched; reruns are safe', () => {
  writeFileSync(join(root, 'index.html'), '<p>Existing reader</p>');
  const result = run('--project', root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /assets\/image-preview\/image-preview.css/);
  assert.equal(readdirSync(join(root, 'assets/image-preview')).length, 4);
  assert.equal(readFileSync(join(root, 'index.html'), 'utf8'), '<p>Existing reader</p>');
  assert.equal(run('--project', root).status, 0);
});

test('refuses differing files; explicit force can update them', () => {
  const css = join(root, 'assets/image-preview/image-preview.css');
  writeFileSync(css, 'custom');
  assert.equal(run('--project', root).status, 1);
  assert.equal(readFileSync(css, 'utf8'), 'custom');
  assert.equal(run('--project', root, '--force').status, 0);
  assert.notEqual(readFileSync(css, 'utf8'), 'custom');
});

test('rejects escapes, missing paths and malformed arguments', () => {
  for (const args of [[], ['--project'], ['--project', join(root, 'missing')], ['--project', root, '--asset-dir', '../outside'], ['--project', root, '--asset-dir', '.'], ['--project', root, '--asset-dir'], ['--project', root, '--unknown']]) {
    assert.equal(run(...args).status, 1, args.join(' '));
  }
});

test('handles Unicode and spaces in nested asset paths', () => {
  const result = run('--project', root, '--asset-dir', 'reader assets/示例');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /reader%20assets\/%E7%A4%BA%E4%BE%8B\/image-preview.css/);
});

test('refuses symlink/junction directory escapes', () => {
  const outside = mkdtempSync(join(tmpdir(), 'adaptive-preview-outside-'));
  mkdirSync(join(root, 'links'));
  symlinkSync(outside, join(root, 'links/escape'), 'junction');
  const result = run('--project', root, '--asset-dir', 'links/escape/viewer');
  assert.equal(result.status, 1);
  assert.equal(readdirSync(outside).length, 0);
});
