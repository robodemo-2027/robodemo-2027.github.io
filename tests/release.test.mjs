import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterResults,resultCSV} from '../release-2026.js';
import {timeline,stateAt,transition} from '../method-state.js';
import {methodVisual} from '../method-motion.js';
import {methodChapters,playbackPosition} from '../method-navigation.js';
import {retrievalSVG,retrievalStage} from '../retrieval-motion.js';

const rows=JSON.parse(fs.readFileSync(new URL('../data/task-level.json',import.meta.url)));

test('five released models account for all 3600 episodes',()=>{
  assert.equal(rows.length,360);
  assert.equal(new Set(rows.map(r=>r.model)).size,5);
  assert.equal(rows.reduce((n,r)=>n+r.episodes,0),3600);
});
test('Full50 result remains 1692/2000',()=>{
  const full=filterResults(rows,{model:'full50'});
  assert.equal(full.length,200);
  assert.ok(full.every(row=>row.split==='seen'));
  assert.equal(filterResults(rows,{model:'full50',split:'seen'}).length,200);
  assert.equal(full.reduce((n,r)=>n+r.successes,0),1692);
});
test('overview uses one native 1080p player and default English subtitles',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/<video id="overview"[^>]*controls[^>]*summary-en-1080p.mp4/);
  assert.match(html,/<track[^>]*srclang="en"[^>]*default>/);
  for(const id of ['hero-index','film-toolbar','film-chapter','film-transcript','demo-timing']){
    assert.ok(!html.includes(`"${id}"`),id);
  }
  assert.equal((html.match(/<figcaption data-en="Figure [123]\./g)||[]).length,3);
});
test('retrieval diagram transports visible tokens through four stages',()=>{
  assert.deepEqual([0,4,8,12].map(retrievalStage),[0,1,2,3]);
  assert.notEqual(retrievalSVG(.5),retrievalSVG(1.5));
  for(const t of [0,.5,4.5,8.5,12.5,16]){
    assert.ok(!/NaN|undefined/.test(retrievalSVG(t)));
    assert.match(retrievalSVG(t),/marker-end/);
  }
});
test('six retrieval/execution pairs retain distinct recorded identities',()=>{
  const pairs=JSON.parse(fs.readFileSync(new URL('../data/retrieval-pairs.json',import.meta.url)));
  assert.equal(pairs.length,6);
  assert.equal(new Set(pairs.map(row=>row.execution.trial_id)).size,6);
  assert.ok(pairs.some(row=>!row.execution.success));
  for(const pair of pairs){
    assert.equal(pair.execution.steps,500);
    for(const kind of ['reference','execution']){
      assert.ok(fs.existsSync(new URL(`../assets/media/retrieval-pairs/${pair.key}-${kind}.mp4`,import.meta.url)));
    }
  }
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
