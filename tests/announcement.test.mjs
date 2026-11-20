import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluationCommand, checkpointSteps} from '../evaluation-starter.js';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const gh = 'https://github.com/robodemo-2027/RoboDemo';
const version = 'v0.1-evaluation';

test('release announcement links the published version before motivation', () => {
  const start = html.indexOf('id="release"');
  const end = html.indexOf('</aside>', start);
  assert.ok(start > 0 && end < html.indexOf('id="motivation"'));
  const announcement = html.slice(start, end);
  assert.ok(announcement.includes(`${gh}/releases/tag/${version}`));
  assert.ok(announcement.includes(`${gh}/blob/${version}/docs/quickstart.md`));
  assert.match(announcement, /datetime="2026-11-20"/);
  assert.match(announcement, /data-en=/);
  assert.match(announcement, /data-zh=/);
});

test('release resources link asset setup, Apptainer and the measured validation', () => {
  for (const path of ['docs/data-preparation.md', 'docs/apptainer.md', 'docs/validation/20261120-release.json']) {
    assert.ok(html.includes(`${gh}/blob/${version}/${path}`), path);
  }
  assert.match(html, /113 CPU tests per policy variant/);
  assert.ok(html.includes(`https://huggingface.co/mxk1998/RoboDemo-Docker/tree/${version}`));
  assert.match(html, /Training code is the next release/);
});

test('all model command combinations download the published checkpoint revision', () => {
  for (const model of Object.keys(checkpointSteps)) {
    for (const gpus of ['1', '8']) {
      for (const memory of ['32', '80']) {
        for (const plan of ['smoke', 'full']) {
          assert.ok(evaluationCommand({model, gpus, memory, plan}).includes(`--revision ${version}`));
        }
      }
    }
  }
});
