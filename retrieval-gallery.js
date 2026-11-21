import {loadJSON,escapeHTML as escape,tr} from './lib.js';
import {successfulRetrievedCases} from './successful-demos.js?v=20261121-six';

export async function initRetrievalGallery() {
  const host=document.querySelector('#retrieval-gallery');
  const [allRows,evidence]=await Promise.all([
    loadJSON('data/retrieval-success-pairs.json'),
    loadJSON('data/retrieval-success-evidence.json?v=20261121-six')
  ]);
  const rows=successfulRetrievedCases(allRows,evidence);
  if(!rows.length)throw new Error('No verified successful retrieval-guided recordings.');
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries) {
      const video=entry.target;
      if(entry.isIntersecting&&!video.getAttribute('src')) {
        video.src=video.dataset.pairSrc;video.preload='metadata';
      }
      if(!entry.isIntersecting)video.pause();
    }
  },{rootMargin:'100px 0px',threshold:.01});
  function render(){
    host.querySelectorAll('video').forEach(video=>video.pause());
    observer.disconnect();
    document.querySelector('#retrieval-success-count').textContent=tr(`${rows.length} SUCCESSFUL CASES`,`${rows.length} 个成功案例`);
    host.innerHTML=rows.map(row=>{
    const clip=(kind,label,instruction)=>{
      const base=row.media[kind];
      return `<figure><figcaption>${label}</figcaption><video controls muted playsinline preload="none" poster="${base}.jpg" data-pair-src="${base}.mp4" aria-label="${escape(row.title+' / '+label)}"></video><p>${escape(instruction)}</p></figure>`;
    };
    return `<article class="retrieval-case" data-outcome="success" data-case="${escape(row.key)}"><header><h4>${escape(tr(row.title,row.titleZh||row.title))}</h4><span>${tr('FINAL SUCCESS','终态成功')} / ${escape(row.execution.level)} / ${escape(row.execution.split.toUpperCase())}</span></header><div class="paired-clips">${clip('reference',tr('RETRIEVED VIDEO INPUT','检索视频输入'),row.reference.instruction)}${clip('execution',tr('SUCCESSFUL ROBOT EXECUTION','成功的机器人执行'),row.execution.instruction)}</div><p class="pair-identity">${escape(row.reference.uid)} &rarr; ${escape(row.execution.trial_id)}</p></article>`;
  }).join('');
    host.querySelectorAll('video').forEach(video=>observer.observe(video));
  }
  document.addEventListener('languagechange',render);
  render();
}
