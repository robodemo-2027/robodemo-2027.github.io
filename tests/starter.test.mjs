import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkpointSteps, evaluationCommand} from '../evaluation-starter.js';

test('starter covers the five released steps and both launchers', () => {
  assert.deepEqual(Object.values(checkpointSteps), [240000, 90000, 160000, 260000, 100000]);
  for (const model of Object.keys(checkpointSteps)) {
    for (const gpus of ['1', '8']) {
      const command = evaluationCommand({model, gpus});
      assert.ok(command.includes(`export MODEL=${model}`));
      assert.ok(command.includes(gpus === '1' ? '-single.sh' : '-8gpu.sh'));
      assert.ok(command.includes(`--workers-per-gpu 1 --max-episodes ${gpus}`));
      assert.ok(command.includes('check_environment.py --assets'));
      assert.ok(command.includes('environment.json" &&'));
    }
  }
});

test('full evaluation removes only the episode limit', () => {
  for (const model of Object.keys(checkpointSteps)) {
    const command = evaluationCommand({model, gpus: '8', plan: 'full'});
    assert.ok(!command.includes('--max-episodes'));
    assert.match(command, /export CUDA_VISIBLE_DEVICES=0,1,2,3,4,5,6,7/);
    assert.match(command, /--workers-per-gpu 1/);
    assert.match(command, /8gpu-1worker-full/);
  }
});

test('80 GB preset uses two workers and keeps the episode limit global', () => {
  for (const model of Object.keys(checkpointSteps)) {
    for (const gpus of ['1', '8']) {
      const command = evaluationCommand({model, gpus, memory: '80'});
      assert.ok(command.includes(`--workers-per-gpu 2 --max-episodes ${Number(gpus) * 2}`));
      assert.ok(command.includes(`${gpus}gpu-2worker-smoke`));
      assert.ok(!evaluationCommand({model, gpus, memory: '80', plan: 'full'}).includes('--max-episodes'));
    }
  }
});

test('starter accepts only published models and supported presets', () => {
  for (const options of [{model: '__proto__'}, {model: '$(id)'}, {gpus: '2'}, {memory: '16'}, {plan: 'short'}]) {
    assert.throws(() => evaluationCommand(options), RangeError);
  }
});

test('resource section provides setup and validation without JavaScript', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="starter-command"/);
  assert.match(html, /id="starter-status"[^>]*role="status"/);
  assert.ok(html.includes(evaluationCommand().replaceAll('&', '&amp;')));
  for (const path of ['docs/reproduce.md', 'docs/evaluation-scaling.md', 'environments', 'results/README.md']) {
    assert.ok(html.includes(`https://github.com/robodemo-2027/RoboDemo/${path === 'environments' ? 'tree' : 'blob'}/main/${path}`));
  }
});
