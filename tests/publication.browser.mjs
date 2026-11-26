import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {publication} from '../content/config.js';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SITE_URL||'http://127.0.0.1:4193/';
const output=process.env.QA_OUTPUT||'/tmp/robodemo-publication-qa';
const browser=await chromium.launch({
  headless:true,
  ...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})
});
await fs.mkdir(output,{recursive:true});
const reports=[];
try{
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#radar polygon[data-model]');
    await page.evaluate(()=>document.fonts.ready);
    await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
    const names=await page.locator('.author-list li').evaluateAll(els=>els.map(el=>el.firstChild.textContent));
    assert.deepEqual(names,publication.authors);
    assert.deepEqual(await page.locator('.author-list sup').allTextContents(),
      publication.authorAffiliations.map((id,i)=>`${id}${i<2?',*':''}`));
    assert.deepEqual(await page.locator('.affiliation-list li').allTextContents(),
      publication.affiliations.map((name,i)=>`${i+1} ${name}`));
    assert.equal(await page.locator('.publication-authors').isVisible(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    await page.screenshot({path:path.join(output,`authors-${width}.png`)});
    await page.locator('#theme-toggle').click();
    assert.equal(await page.locator('.publication-authors').isVisible(),true);
    await page.screenshot({path:path.join(output,`authors-dark-${width}.png`)});
    await page.locator('#theme-toggle').click();
    await page.locator('#language').click();
    assert.equal(await page.locator('.equal-contribution').innerText(),'* 共同第一作者');
    assert.deepEqual(await page.locator('.author-list li').evaluateAll(els=>els.map(el=>el.firstChild.textContent)),names);
    await page.locator('#language').click();

    const film=page.locator('#overview');
    await film.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'center'}));
    await film.evaluate(async video=>{video.muted=true;await video.play();video.pause();});
    await page.waitForFunction(()=>document.querySelector('#overview').readyState>=2,{},{timeout:90000});
    const info=await film.evaluate(video=>({
      duration:video.duration,width:video.videoWidth,height:video.videoHeight,
      src:video.currentSrc,poster:video.poster
    }));
    assert.ok(info.src.includes('summary-public-authors-1080p.mp4'));
    assert.ok(info.poster.includes('summary-public-authors.jpg'));
    assert.ok(Math.abs(info.duration-7619/30)<.05);
    assert.equal(info.width,1920);
    assert.equal(info.height,1080);
    await page.waitForFunction(()=>{
      const track=document.querySelector('#overview').textTracks[0];
      return track?.mode==='showing'&&track.cues?.length===81;
    });
    for(const time of [2,8.5,135,249]){
      await film.evaluate((video,time)=>{video.pause();video.currentTime=time;},time);
      await page.waitForFunction(time=>{
        const video=document.querySelector('#overview');
        return !video.seeking&&video.readyState>=2&&Math.abs(video.currentTime-time)<.05;
      },time,{timeout:90000});
      assert.equal(await film.evaluate(video=>video.error?.message||null),null);
      if(time===2||time===249){
        await film.screenshot({path:path.join(output,`film-${time===2?'title':'closing'}-${width}.png`)});
      }
    }
    await film.evaluate(async video=>{video.muted=true;video.currentTime=2;await video.play();});
    await page.waitForFunction(()=>document.querySelector('#overview').currentTime>2.5);
    await film.evaluate(video=>video.pause());
    assert.equal(await page.locator('#app-status').isVisible(),false);
    assert.deepEqual(errors,[]);
    reports.push({width,authors:names.length,affiliations:4,captions:81,film:info,errors});
    await page.close();
  }
}finally{
  await browser.close();
}
await fs.writeFile(path.join(output,'publication-report.json'),JSON.stringify({base,reports},null,2)+'\n');
console.log(JSON.stringify({base,reports},null,2));
