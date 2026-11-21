import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {successfulHumanCases,successfulRetrievedCases} from '../successful-demos.js';

const read=name=>JSON.parse(fs.readFileSync(new URL(`../data/${name}`,import.meta.url)));
const demos=read('demos.json'),pairs=read('retrieval-pairs.json'),evidence=read('retrieval-success-evidence.json');

test('human showcase contains only six final successes with matching trial and reference evidence',()=>{
  const cases=successfulHumanCases(demos);
  assert.equal(cases.length,6);
  assert.equal(new Set(cases.map(row=>row.trial)).size,6);
  for(const row of cases)assert.equal(row.withSuccess,true);
});
test('retrieval showcase excludes all four failures while preserving the six-record source',()=>{
  assert.equal(pairs.length,6);
  assert.equal(pairs.filter(row=>row.execution.success===false).length,4);
  assert.deepEqual(successfulRetrievedCases(pairs,evidence).map(row=>row.key),['foldtowel','placemugrack']);
});
test('selected retrieval recordings match the published successful episode and media hashes',()=>{
  for(const row of successfulRetrievedCases(pairs,evidence)){
    const record=evidence.records.find(item=>item.trial_id===row.execution.trial_id);
    assert.equal(record.success,true);
    assert.equal(record.status,'completed');
    assert.equal(record.reference_type,'robot');
    assert.equal(record.reference_uid,row.reference.uid);
    assert.equal(record.recorded_steps,500);
    for(const kind of ['reference','execution']){
      const bytes=fs.readFileSync(new URL(`../assets/media/retrieval-pairs/${row.key}-${kind}.mp4`,import.meta.url));
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),record.media_sha256[kind]);
    }
  }
});
test('synthetic missing, false, truthy-string, incomplete and mismatched evidence never becomes a success',()=>{
  for(const success of [false,undefined,null,0,'true',1]){
    const altered=structuredClone(pairs);
    altered.forEach(row=>row.execution.success=success);
    assert.deepEqual(successfulRetrievedCases(altered,evidence),[]);
  }
  for(const change of [
    record=>record.success=false,
    record=>record.status='incomplete',
    record=>record.reference_uid='synthetic-mismatch',
    record=>record.reference_type='human',
    record=>record.recorded_steps=499,
  ]){
    const altered=structuredClone(evidence);
    altered.records.forEach(change);
    assert.deepEqual(successfulRetrievedCases(pairs,altered),[]);
  }
  assert.deepEqual(successfulRetrievedCases(pairs,{records:[]}),[]);
  const altered=structuredClone(demos);
  altered.evidence.cases.forEach(record=>record.with_demo_success=false);
  assert.deepEqual(successfulHumanCases(altered),[]);
});
test('human and retrieved successes have separate anchored sections and no failed-comparison UI',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/<section id="human-demos"/);
  assert.match(html,/id="retrieved-demos" aria-labelledby="retrieved-demos-title"/);
  assert.match(html,/Success with human demonstrations\./);
  assert.match(html,/Success with retrieved videos\./);
  assert.ok(html.indexOf('id="human-demos"')<html.indexOf('id="retrieved-demos"'));
  assert.ok(html.indexOf('id="retrieved-demos"')<html.indexOf('id="real-world"'));
  for(const forbidden of ['id="demo-mode"','value="ablation"','value="mismatch"','ALTERNATIVE INPUT / RETRIEVED ROBOT VIDEO']){
    assert.ok(!html.includes(forbidden),forbidden);
  }
  const renderer=fs.readFileSync(new URL('../demos.js',import.meta.url),'utf8');
  for(const forbidden of ['t.videos.without','c.robotVideo','FINAL FAILURE','data.conditions']){
    assert.ok(!renderer.includes(forbidden),forbidden);
  }
  assert.match(renderer,/params\.set\('comparison','paired'\)/);
});
