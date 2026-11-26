import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {aggregate,models,radius,renderFullTable,fullTableGroups} from '../performance.js';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const data=JSON.parse(fs.readFileSync(new URL('../data/full50.json',import.meta.url)));
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

test('polygon comparison is a visible section before the long result tables',()=>{
  const panel=html.match(/<section class="performance-comparison"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert.ok(panel,'The chart must not live inside a collapsed details element');
  const preceding=panel.slice(0,panel.indexOf('<div id="radar">'));
  assert.ok(preceding.includes('id="radar-title"'));
  assert.ok(!preceding.includes('<details'));
  assert.ok(!html.includes('class="benchmark-details"'));
  assert.ok(html.indexOf('id="full50-comparison"')<html.indexOf('id="released-results"'));
  assert.ok(html.indexOf('id="full50-comparison"')<html.indexOf('id="result-explorer"'));
  for(const id of ['result-level','result-scale','radar','group-info']){
    assert.equal(html.split(`id="${id}"`).length-1,1,`${id} must remain unique`);
  }
  assert.match(panel,/<h3 id="full50-title" data-en="[^"]+" data-zh="[^"]+"/);
});

test('requested chart notes and appendix panels are removed without deleting exact data',()=>{
  for(const text of ['Relative 100 means group-best','Nine group means lead under this post-hoc grouping',
    'Evaluation protocol and chart guide',"All 50 tasks and the paper's five reporting groups",
    'id="full-table"','id="radar-scale-note"']){
    assert.ok(!html.includes(text),text);
  }
  assert.equal(data.tasks.length,50);
  assert.equal(data.paperTaxonomy.length,5);
});

test('approved nine operation groups cover all 50 tasks exactly once',()=>{
  const names=data.groups.flatMap(group=>group.tasks);
  assert.equal(data.groups.length,9);
  assert.equal(names.length,50);
  assert.equal(new Set(names).size,50);
  assert.deepEqual(new Set(names),new Set(data.tasks.map(task=>task.task)));
  assert.deepEqual(data.groups.map(group=>group.tasks.length),[3,2,3,4,8,17,6,2,5]);
});

test('all five views average tasks before normalizing by the group-best mean',()=>{
  for(let level=0;level<5;level++){
    const groups=aggregate(data,level);
    groups.forEach((group,i)=>{
      const tasks=data.tasks.filter(task=>data.groups[i].tasks.includes(task.task));
      const raw=Object.fromEntries(models.map(model=>[model,
        tasks.reduce((sum,task)=>sum+task[model][level],0)/tasks.length]));
      const best=Math.max(...Object.values(raw));
      for(const model of models){
        close(group.raw[model],raw[model]);
        close(group.relative[model],raw[model]/best*100);
      }
    });
  }
});

test('Mean uses each task L0-L3 average and RoboDemo leads the nine Mean groups',()=>{
  for(const task of data.tasks)for(const model of models){
    close(task[model][4],task[model].slice(0,4).reduce((sum,value)=>sum+value,0)/4);
  }
  for(const group of aggregate(data)){
    close(group.relative.RoboDemo,100);
    assert.ok(group.raw.RoboDemo-Math.max(group.raw.ACT,group.raw.DP)>=2.5-1e-9);
  }
});

test('overall success is task-weighted, not an unweighted mean of unequal groups',()=>{
  const groups=aggregate(data);
  const expected={RoboDemo:84.6,ACT:74.85,DP:64.05};
  for(const model of models){
    close(groups.reduce((sum,group)=>sum+group.raw[model]*group.n,0)/50,expected[model]);
  }
  assert.equal(data.successes,1692);
  assert.equal(data.trials,2000);
});

test('approved radial scales retain low and high actual-success values',()=>{
  close(radius(0,false),0);
  close(radius(50,false),.15);
  close(radius(90,false),.85);
  close(radius(100,false),1);
  close(radius(50,true),.12);
  close(radius(100,true),1);
  for(let value=1;value<=100;value++)assert.ok(radius(value,false)>radius(value-1,false));
});

test('archived full table renderer retains five groups and DP-ACT-Ours order',()=>{
  const table=renderFullTable(data);
  assert.equal(fullTableGroups(data).length,5);
  assert.equal((table.match(/data-task=/g)||[]).length,50);
  assert.match(table,/aria-label="Avg DP">DP<\/th><th scope="col" aria-label="Avg ACT">ACT<\/th><th scope="col" aria-label="Avg Ours">Ours<\/th>/);
  assert.ok(!table.includes('100.0'));
});
