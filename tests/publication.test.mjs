import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
