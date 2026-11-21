import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {humanCards} from '../demos.js';
import {retrievedCards} from '../retrieval-gallery.js';
import {pairedGalleryMarkup} from '../paired-gallery.js';

const read=name=>JSON.parse(fs.readFileSync(new URL(`../data/${name}`,import.meta.url)));
const galleries=[
  humanCards(read('demos.json')),
  retrievedCards(read('retrieval-success-pairs.json'),read('retrieval-success-evidence.json'))
];

test('both six-pair galleries bind all 24 original videos immediately with native controls',()=>{
  const sources=[];
  for(const rows of galleries){
    assert.equal(rows.length,6);
    const html=pairedGalleryMarkup(rows);
    assert.equal((html.match(/<article /g)||[]).length,6);
    const videos=[...html.matchAll(/<video ([^>]+)>/g)];
    assert.equal(videos.length,12);
    for(const [i,[,attrs]] of videos.entries()){
      assert.match(attrs,/controls muted playsinline preload="metadata"/);
      assert.doesNotMatch(attrs,/data-(?:pair|lazy)-src|autoplay/);
      const src=attrs.match(/(?:^| )src="([^"]+)"/)[1];
      assert.equal(src,rows[Math.floor(i/2)][i%2?'execution':'reference'].src);
      assert.ok(fs.existsSync(new URL(`../${src}`,import.meta.url)));
      sources.push(src);
    }
  }
  assert.equal(new Set(sources).size,24);
});

test('gallery translations have the same media, ordering and recording identities',()=>{
  for(const rows of galleries){
    const en=pairedGalleryMarkup(rows,'en'),zh=pairedGalleryMarkup(rows,'zh');
    assert.deepEqual(en.match(/<video [^>]+ data-identity="[^"]+"/g),zh.match(/<video [^>]+ data-identity="[^"]+"/g));
    assert.ok(zh.includes(rows[0].title[1]));
    assert.ok(en.includes(rows[0].title[0]));
    assert.equal((en.match(/class="video-error" role="status" hidden/g)||[]).length,12);
    for(const row of rows)for(const kind of ['reference','execution']){
      assert.ok(en.includes(`href="${row[kind].src}"`));
    }
  }
});

test('localized card text is escaped for both initial markup and language changes',()=>{
  const row=structuredClone(galleries[0][0]);
  row.title=['<img src=x onerror=alert(1)>','<script>alert(1)</script>'];
  row.reference.instruction='<iframe src="untrusted">';
  const html=pairedGalleryMarkup([row]);
  assert.doesNotMatch(html,/<img |<script>|<iframe /);
  assert.match(html,/data-en="&amp;lt;img/);
  assert.match(html,/&lt;iframe src=&quot;untrusted&quot;&gt;/);
});

test('no old human toolbar, task tabs, scroll-gated sources or playback synchronization remains',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const id of ['demo-tabs','demo-lab','demo-play','demo-replay','demo-prev','demo-next','demo-speed','demo-expand','demo-retry','demo-step','demo-scrub','demo-first','demo-final','demo-align']){
    assert.ok(!html.includes(`id="${id}"`),id);
  }
  assert.match(html,/id="human-gallery" class="retrieval-gallery"/);
  for(const file of ['demos.js','retrieval-gallery.js','paired-gallery.js']){
    const code=fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
    assert.doesNotMatch(code,/IntersectionObserver|MediaSession|requestAnimationFrame|playbackRate|guardVisible/);
  }
  const code=fs.readFileSync(new URL('../paired-gallery.js',import.meta.url),'utf8');
  const languageHandler=code.slice(code.indexOf("document.addEventListener('languagechange'"));
  assert.doesNotMatch(languageHandler,/innerHTML|replaceChildren|\.src\s*=|\.load\(|\.pause\(/);
});
