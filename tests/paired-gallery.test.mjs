import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {humanCards} from '../demos.js';
import {retrievedCards} from '../retrieval-gallery.js';
import {pairedGalleryMarkup} from '../paired-gallery.js';
import {streamingSources} from '../content/streaming-media.js';

const read=name=>JSON.parse(fs.readFileSync(new URL(`../data/${name}`,import.meta.url)));
const galleries=[
  humanCards(read('demos.json')),
  retrievedCards(read('retrieval-success-pairs.json'),read('retrieval-success-evidence.json'))
];

test('both six-pair galleries bind 24 real sources and load on native play, not on scroll',()=>{
  const sources=[];
  for(const rows of galleries){
    assert.equal(rows.length,6);
    const html=pairedGalleryMarkup(rows);
    assert.equal((html.match(/<article /g)||[]).length,6);
    const videos=[...html.matchAll(/<video ([^>]+)>/g)];
    assert.equal(videos.length,12);
    for(const [i,[,attrs]] of videos.entries()){
      assert.match(attrs,/controls muted playsinline preload="none"/);
      assert.doesNotMatch(attrs,/data-(?:pair|lazy)-src|autoplay/);
      const src=attrs.match(/(?:^| )src="([^"]+)"/)[1];
      const original=rows[Math.floor(i/2)][i%2?'execution':'reference'].src;
      assert.equal(src,streamingSources[original]?.src||original);
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
      const src=streamingSources[row[kind].src]?.src||row[kind].src;
      assert.ok(en.includes(`href="${src}"`));
    }
  }
});

test('all 24 delivery videos have fast-start indexes and six lossless copies preserve original files',()=>{
  assert.equal(Object.keys(streamingSources).length,6);
  const readFile=src=>fs.readFileSync(new URL(`../${src}`,import.meta.url));
  const hash=src=>crypto.createHash('sha256').update(readFile(src)).digest('hex');
  for(const [original,delivery] of Object.entries(streamingSources)){
    assert.equal(hash(original),delivery.originalSha256);
    assert.equal(hash(delivery.src),delivery.sha256);
    assert.equal(delivery.nb_frames,'501');
    assert.equal(delivery.duration,'25.050000');
    assert.equal(delivery.codec_name,'h264');
    assert.match(delivery.videoPacketSha256,/^[a-f0-9]{64}$/);
  }
  for(const rows of galleries)for(const row of rows)for(const kind of ['reference','execution']){
    const src=streamingSources[row[kind].src]?.src||row[kind].src;
    const bytes=readFile(src),atoms=[];
    for(let offset=0;offset<bytes.length;){
      let size=bytes.readUInt32BE(offset);
      if(size===1)size=Number(bytes.readBigUInt64BE(offset+8));
      assert.ok(size>=8&&offset+size<=bytes.length,`Invalid MP4 atom: ${src}`);
      atoms.push(bytes.toString('ascii',offset+4,offset+8));offset+=size;
    }
    assert.ok(atoms.includes('moov')&&atoms.includes('mdat'),src);
    assert.ok(atoms.indexOf('moov')<atoms.indexOf('mdat'),`Index must precede video data: ${src}`);
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
