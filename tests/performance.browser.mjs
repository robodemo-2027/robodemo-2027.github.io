import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {aggregate,models,radius} from '../performance.js';

// Use an installed Playwright runtime; no browser profile or login is shared.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SITE_URL||'http://127.0.0.1:4193/';
const output=process.env.QA_OUTPUT||'/tmp/robodemo-performance-qa';
const data=JSON.parse(await fs.readFile(new URL('../data/full50.json',import.meta.url)));
const browser=await chromium.launch({
  headless:true,
  ...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})
});
await fs.mkdir(output,{recursive:true});
const reports=[];
try{
  for(const width of [1440,820,390]){
    const page=await browser.newPage({viewport:{width,height:width>=820?1280:1100},reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(new URL('#full50-comparison',base).href,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#radar polygon[data-model]');
    await page.evaluate(()=>document.fonts.ready);
    await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
    assert.equal(await page.locator('#radar').isVisible(),true);
    assert.equal(await page.locator('#radar').evaluate(el=>Boolean(el.closest('details'))),false);
    assert.equal(await page.evaluate(()=>{
      const chart=document.querySelector('#full50-comparison').getBoundingClientRect();
      return chart.top<document.querySelector('#released-results').getBoundingClientRect().top
        &&chart.top<document.querySelector('#result-explorer').getBoundingClientRect().top;
    }),true);

    const shapes=[];
    for(const level of [4,0,1,2,3])for(const scale of ['relative','raw']){
      await page.selectOption('#result-level',String(level));
      await page.selectOption('#result-scale',scale);
      const groups=aggregate(data,level);
      const polygons=await page.locator('#radar polygon[data-model]').evaluateAll(els=>
        els.map(el=>({model:el.dataset.model,points:el.getAttribute('points'),fill:el.getAttribute('fill')})));
      assert.equal(polygons.length,3);
      assert.deepEqual(new Set(polygons.map(p=>p.model)),new Set(models));
      for(const polygon of polygons){
        const points=polygon.points.split(' ').map(pair=>pair.split(',').map(Number));
        assert.equal(points.length,9);
        assert.notEqual(polygon.fill,'none');
        for(const [i,[x,y]] of points.entries()){
          const value=groups[i][scale][polygon.model];
          const r=180*radius(value,scale==='relative'),angle=-Math.PI/2+i*Math.PI*2/9;
          assert.ok(Math.abs(x-(330+Math.cos(angle)*r))<1e-7);
          assert.ok(Math.abs(y-(278+Math.sin(angle)*r))<1e-7);
        }
      }
      shapes.push(polygons.map(p=>p.points).join('|'));
      assert.match(await page.locator('#radar-title').innerText(),new RegExp(data.metrics[level]));
      if(scale==='relative'){
        assert.match(await page.locator('#radar-scale-note').innerText(),/not 100% success/);
      }else{
        assert.match(await page.locator('#radar-scale-note').innerText(),/No raw values are clipped/);
      }
    }
    assert.equal(new Set(shapes).size,10,'Every level and scale must redraw the polygons');
    await page.locator('#radar g[data-group="8"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#group-info h3').innerText(),'Measuring & scanning');
    assert.match(await page.locator('#group-info .task-list').innerText(),/ScanPillBottle/);
    await page.locator('#language').click();
    assert.equal(await page.locator('#full50-title').innerText(),'九类操作，一览模型表现。');
    assert.match(await page.locator('#radar-title').innerText(),/原始成功率/);
    assert.equal(await page.locator('#radar').isVisible(),true);
    await page.locator('#language').click();
    await page.selectOption('#result-level','4');
    await page.selectOption('#result-scale','relative');
    await page.locator('#radar g[data-group="0"]').focus();
    await page.locator('#full50-title').click();
    await page.locator('#full50-comparison').evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
    await page.waitForFunction(()=>Math.abs(document.querySelector('#full50-comparison').getBoundingClientRect().top-110)<2);
    await page.screenshot({path:path.join(output,`polygons-${width}.png`)});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,
      'No horizontal page overflow');
    if(width===1440){
      const tableDetails=page.locator('#full-table').locator('..');
      await tableDetails.locator(':scope > summary').click();
      assert.equal(await page.locator('#full-table [data-task]').count(),50);
      await page.locator('#full-table-search').fill('CleanCup');
      await page.locator('.table-locator button[type="submit"]').click();
      assert.match(await page.locator('#full-table-status').innerText(),/CleanCup/);
      await page.selectOption('#filter-model','full50');
      assert.match(await page.locator('#result-count').innerText(),/200/);
    }
    assert.equal(await page.locator('#human-gallery video').count(),12);
    assert.equal(await page.locator('#retrieval-gallery video').count(),12);
    assert.equal(await page.locator('#app-status').isVisible(),false);
    assert.deepEqual(errors,[]);
    reports.push({width,visible:true,views:shapes.length,models:3,vertices:9,errors});
    await page.close();
  }
}finally{
  await browser.close();
}
await fs.writeFile(path.join(output,'report.json'),JSON.stringify({base,reports},null,2)+'\n');
console.log(JSON.stringify({base,reports},null,2));
