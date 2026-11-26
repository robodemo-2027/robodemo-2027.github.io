import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {publication} from '../content/config.js';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const paperURL = 'https://arxiv.org/abs/2611.32256';

test('arXiv resource button links the published paper rather than the project page', () => {
  const buttons = html.match(/<div class="resource-buttons">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(buttons);
  assert.match(buttons, /<a[^>]*href="https:\/\/arxiv\.org\/abs\/2611\.32256"[^>]*>[\s\S]*?<span>arXiv<\/span><\/a>/);
  assert.equal(publication.paperURL, paperURL);
  assert.ok(!html.includes('arXiv link coming soon'));
});

test('page and configuration share the public arXiv citation', () => {
  const citation = html.match(/<details id="citation">[\s\S]*?<pre>([\s\S]*?)<\/pre>/)?.[1];
  assert.equal(citation, publication.bibtex);
  assert.match(citation, /year = \{2026\}/);
  assert.match(citation, /eprint = \{2611\.32256\}/);
  assert.ok(citation.includes(`url = {${paperURL}}`));
  assert.equal(publication.authors.length, 11);
  assert.equal(publication.authors[0], 'Xiangkai Ma');
  assert.equal(publication.authors.at(-1), 'Wenzhong Li');
  assert.ok(!/Anonymous|Manuscript under review/.test(html));
});

test('hero credits list every author, exact affiliation and equal contribution before resource links',()=>{
  const credits=html.match(/<section class="publication-authors"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert.ok(credits);
  assert.ok(html.indexOf('class="publication-authors"')<html.indexOf('class="resource-buttons"'));
  assert.deepEqual(publication.authorAffiliations,[1,2,3,1,4,4,4,1,1,1,1]);
  assert.deepEqual(publication.affiliations,[
    'Nanjing University','Joy Future Academy, JD','South China University of Technology',
    'The Chinese University of Hong Kong, Shenzhen']);
  assert.deepEqual(publication.equalContribution,['Xiangkai Ma','Zhihao Yuan']);
  let position=-1;
  for(const [i,name] of publication.authors.entries()){
    const marker=`${publication.authorAffiliations[i]}${i<2?',*':''}`;
    const author=`<li>${name}<sup>${marker}</sup></li>`;
    assert.ok(credits.indexOf(author)>position,name);
    position=credits.indexOf(author);
  }
  for(const [i,name] of publication.affiliations.entries())assert.ok(credits.includes(`<li><sup>${i+1}</sup> ${name}</li>`));
  assert.ok(credits.includes('* Equal contribution'));
});

test('film metadata, transcript, and both editable SVG cards carry the same public credits',()=>{
  const film=JSON.parse(fs.readFileSync(new URL('../data/summary-film-en.json',import.meta.url)));
  for(const key of ['authors','affiliations','authorAffiliations','equalContribution']){
    assert.deepEqual(film.credits[key],publication[key]);
  }
  const transcript=fs.readFileSync(new URL('../assets/subtitles/summary-en-transcript.txt',import.meta.url),'utf8');
  for(const name of [...publication.authors,...publication.affiliations])assert.ok(transcript.includes(name));
  assert.doesNotMatch(transcript,/Anonymous|under review/i);
  for(const id of ['title','closing']){
    const svg=fs.readFileSync(new URL(`../assets/svg/film-${id}-authors.svg`,import.meta.url),'utf8');
    assert.match(svg,/<svg[^>]*viewBox="0 0 1920 1080"/);
    assert.doesNotMatch(svg,/Anonymous|under review/i);
    for(const name of [...publication.authors,...publication.affiliations])assert.ok(svg.includes(name),name);
    assert.ok(svg.includes('* Equal contribution'));
    for(const [,y] of svg.matchAll(/<text[^>]* y="(\d+)"/g)){
      assert.ok(Number(y)<=880,'Credit text must stay above the native subtitle/control safe area');
    }
  }
  assert.ok(html.includes(film.video));
  assert.ok(html.includes(film.poster));
});

test('published credit recut matches its verified footage and narration preservation receipt',()=>{
  const receipt=JSON.parse(fs.readFileSync(new URL('../data/film-authors-revision.json',import.meta.url)));
  const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(new URL(`../${file}`,import.meta.url))).digest('hex');
  assert.equal(hash(receipt.video),receipt.sha256);
  assert.equal(hash(receipt.captions.path),receipt.captions.sha256);
  assert.equal(receipt.frames,7619);
  assert.equal(receipt.middleVideo.packets,7122);
  assert.equal(receipt.middleVideo.unchanged,true);
  assert.equal(receipt.narration.unchanged,true);
  assert.equal(receipt.narration.packets,11906);
});
