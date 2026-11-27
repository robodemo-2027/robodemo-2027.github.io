import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluationCommand, checkpointSteps} from '../evaluation-starter.js';
import {publication} from '../content/config.js';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const gh = 'https://github.com/robodemo-2027/RoboDemo';
const version = 'v0.1-evaluation';

test('latest training announcement precedes motivation and retains the evaluation release', () => {
  const start = html.indexOf('id="release"');
  const end = html.indexOf('</aside>', start);
  assert.ok(start > 0 && end < html.indexOf('id="motivation"'));
  const announcement = html.slice(start, end);
  assert.ok(announcement.includes(`${gh}/releases/tag/${version}`));
  assert.ok(announcement.includes(publication.trainingURL));
  assert.ok(announcement.includes('href="#release-status"'));
  assert.match(announcement, /datetime="2026-11-27"/);
  assert.match(announcement, /data-en=/);
  assert.match(announcement, /data-zh=/);
});

test('release resources link asset setup, Apptainer and the measured validation', () => {
  for (const path of ['docs/data-preparation.md', 'docs/apptainer.md', 'docs/validation/20261120-release.json']) {
    assert.ok(html.includes(`${gh}/blob/${version}/${path}`), path);
  }
  assert.match(html, /113 CPU tests per policy variant/);
  assert.ok(html.includes(`https://huggingface.co/mxk1998/RoboDemo-Docker/tree/${version}`));
  assert.doesNotMatch(html, /Training code is the next release|训练代码将在后续发布/);
  assert.doesNotMatch(publication.status, /Training code is next/);
});

test('release checklist separates completed CPU training checks from deferred hardware checks', () => {
  const status = html.match(/<section id="release-status"[\s\S]*?<\/section>/)?.[0];
  assert.ok(status);
  const completed = status.match(/<div data-status="done">([\s\S]*?)<\/ul><\/div>/)?.[1];
  const pending = status.match(/<div data-status="todo">([\s\S]*?)<\/ul><\/div>/)?.[1];
  assert.ok(completed && pending);
  assert.equal((completed.match(/<li /g) || []).length, 4);
  assert.equal((pending.match(/<li /g) || []).length, 3);
  assert.ok(completed.includes(publication.trainingURL));
  assert.ok(completed.includes('actions/runs/45940672497'));
  assert.match(completed, /413 passed/);
  assert.match(completed, /CPU training-to-evaluation checks completed/);
  assert.match(pending, /Deferred hardware checks/);
  for (const item of ['eight-gpu', 'docker-gpu', 'training-container']) {
    assert.ok(pending.includes(`data-item="${item}"`));
  }
  assert.equal((status.match(/data-en=/g) || []).length, 11);
  assert.equal((status.match(/data-zh=/g) || []).length, 11);
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
