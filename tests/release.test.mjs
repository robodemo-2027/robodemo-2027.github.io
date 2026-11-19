import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterResults,resultCSV} from '../release-2026.js';
import {timeline,stateAt,transition} from '../method-state.js';
import {methodVisual} from '../method-motion.js';
import {methodChapters,playbackPosition} from '../method-navigation.js';
import {retrievalSVG,retrievalStage,retrievalState} from '../retrieval-motion.js';

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
test('retrieval shares the method palette and writes only after selection',()=>{
  for(const time of [0,3,4,7,8,11])assert.equal(retrievalState(time).memory,0);
  assert.ok(retrievalState(15.9).memory>.99);
  const svg=retrievalSVG(14);
  for(const color of ['#BCA5C3','#D86689','#FFD968'])assert.ok(svg.includes(color));
  assert.match(svg,/viewBox="0 0 1200 640"/);
  assert.match(retrievalSVG(14,{}, {mobile:true}),/viewBox="0 0 390 1620"/);
  for(const file of ['query.jpg',...Array.from({length:4},(_,i)=>`reference-${i}.jpg`)]){
    assert.ok(fs.existsSync(new URL(`../assets/retrieval/${file}`,import.meta.url)));
  }
});
test('research film follows the paper narrative before showing experiments',()=>{
  const film=JSON.parse(fs.readFileSync(new URL('../data/summary-film-en.json',import.meta.url)));
  assert.ok(film.duration>=220&&film.duration<=280);
  assert.equal(film.edit[0].kind,'title');
  assert.equal(film.title,'RoboDemo: Reconciling Demonstration Intent and Execution Progress for Long-Horizon Manipulation');
  const ids=film.edit.map(scene=>scene.id);
  for(const [before,after] of [['title','human'],['motivation','intent'],['intent','progress'],
    ['progress','cascade'],['retrieval','full50'],['full50','scales'],['scales','ablation'],
    ['ablation','profiles'],['profiles','sim-pour'],['sim-fold','real-summary'],
    ['real-summary','real-tabletop']]){
    assert.ok(ids.indexOf(before)<ids.indexOf(after),`${before} before ${after}`);
  }
  assert.ok(film.edit.every((s,i)=>!i||Math.abs(s.start-film.edit[i-1].end)<.001));
  assert.ok(film.edit.flatMap(s=>s.media).every(s=>s.rate===1));
});
test('research film ends with six distinct ten-second real-robot excerpts',()=>{
  const film=JSON.parse(fs.readFileSync(new URL('../data/summary-film-en.json',import.meta.url)));
  const real=film.edit.filter(scene=>scene.kind==='real-robot');
  assert.equal(real.length,6);
  assert.equal(new Set(real.flatMap(scene=>scene.media.map(m=>m.source))).size,6);
  for(const scene of real){
    assert.ok(Math.abs(scene.end-scene.start-10)<.001);
    assert.equal(scene.media.length,1);
    assert.equal(scene.media[0].excerptSeconds,10);
    assert.ok(!scene.media[0].holdFinalFrameSeconds);
  }
  assert.equal(film.edit.at(-1).kind,'closing');
});
test('research film polygons reproduce the released full50 data without changing scales',()=>{
  const film=JSON.parse(fs.readFileSync(new URL('../data/summary-film-en.json',import.meta.url)));
  const full=JSON.parse(fs.readFileSync(new URL('../data/full50.json',import.meta.url)));
  assert.equal(film.radar.length,9);
  for(const [i,group] of full.groups.entries()){
    const means=Object.fromEntries(['DP','ACT','RoboDemo'].map(model=>[model,
      group.tasks.reduce((sum,task)=>sum+full.tasks.find(row=>row.task===task)[model][4],0)/group.tasks.length]));
    assert.equal(film.radar[i].group,group.name);
    for(const model of Object.keys(means)){
      assert.equal(film.radar[i].success_rate[model],means[model]);
      assert.equal(film.radar[i].relative[model],means[model]/Math.max(...Object.values(means))*100);
    }
  }
});
test('English captions stay short and snap above native player controls',()=>{
  const vtt=fs.readFileSync(new URL('../assets/subtitles/summary-en.vtt',import.meta.url),'utf8');
  const srt=fs.readFileSync(new URL('../assets/subtitles/summary-en.srt',import.meta.url),'utf8');
  const blocks=vtt.trim().split('\n\n').slice(1);
  assert.ok(blocks.length>25);
  for(const block of blocks){
    const lines=block.split('\n');
    assert.match(lines[1],/line:-2 /);
    assert.ok(lines[2].length<=50);
    assert.equal(lines.length,3);
  }
  const expectedSrt=blocks.map(block=>{
    const [id,timing,text]=block.split('\n');
    return `${id}\n${timing.split(' line:')[0].replaceAll('.',',')}\n${text}`;
  }).join('\n\n');
  assert.equal(srt.trim(),expectedSrt);
  const css=fs.readFileSync(new URL('../refinement.css',import.meta.url),'utf8');
  assert.match(css,/#overview::cue[^}]*font-size:18px/);
  assert.match(css,/#overview::cue \{font-size:11px\}/);
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
