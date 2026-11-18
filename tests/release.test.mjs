import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterResults,resultCSV} from '../release-2026.js';
import {timeline,stateAt,transition} from '../method-state.js';
import {methodVisual} from '../method-motion.js';
import {methodChapters,playbackPosition} from '../method-navigation.js';

const rows=JSON.parse(fs.readFileSync(new URL('../data/task-level.json',import.meta.url)));

test('five released models account for all 3600 episodes',()=>{
  assert.equal(rows.length,360);
  assert.equal(new Set(rows.map(r=>r.model)).size,5);
  assert.equal(rows.reduce((n,r)=>n+r.episodes,0),3600);
});
test('Full50 result remains 1692/2000',()=>{
  const full=filterResults(rows,{model:'full50'});
  assert.equal(full.length,200);
  assert.equal(full.reduce((n,r)=>n+r.successes,0),1692);
});
test('nested model filters compose',()=>{
  const seen=filterResults(rows,{model:'c15-wo',split:'seen'});
  assert.equal(seen.length,20);
  assert.equal(seen.reduce((n,r)=>n+r.successes,0),180);
  assert.equal(filterResults(rows,{model:'c15-wo',split:'seen',level:'L2'}).length,5);
  assert.equal(filterResults(rows,{task:' foldtowel '}).length,20);
});
test('filtered CSV contains exactly its selected rows',()=>{
  const subset=filterResults(rows,{model:'c30',split:'unseen'});
  assert.equal(resultCSV(subset).trim().split('\n').length,21);
});
test('paper method preloads one reference and preserves independent states',()=>{
  assert.equal(timeline.length,20);
  assert.equal(timeline.filter(t=>t.phase==='preload').length,1);
  const final=stateAt(timeline.length-1,'human');
  assert.equal(final.referenceVersion,1);
  assert.equal(final.referenceFrozen,true);
  assert.equal(final.executionVersion,8);
  assert.deepEqual(final.completed,final.committed);
  assert.throws(()=>transition(final,{phase:'preload',value:1}));
});
test('rendered animation and chapters cover the corrected timeline',()=>{
  assert.equal(methodChapters.at(-1).end,timeline.length);
  for(let i=0;i<timeline.length;i++){
    for(const f of [0,.5,1]){
      const visual=methodVisual(i,f,'human');
      assert.ok(visual.referenceAmount>=0&&visual.referenceAmount<=1);
      assert.ok(visual.referenceFrame>=0&&visual.referenceFrame<4);
      assert.ok(visual.observation>=0&&visual.observation<=8);
      assert.equal(playbackPosition(i,f).chapters.filter(c=>c.active).length,1);
    }
  }
});
