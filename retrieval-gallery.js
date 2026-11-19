import {loadJSON,escapeHTML as escape} from './lib.js';

export async function initRetrievalGallery() {
  const host=document.querySelector('#retrieval-gallery');
  const rows=await loadJSON('data/retrieval-pairs.json');
  host.innerHTML=rows.map(row=>{
    const clip=(kind,label,instruction)=>{
      const base=`assets/media/retrieval-pairs/${row.key}-${kind}`;
      return `<figure><figcaption>${label}</figcaption><video controls muted playsinline preload="none" poster="${base}.jpg" data-pair-src="${base}.mp4" aria-label="${escape(row.title+' / '+label)}"></video><p>${escape(instruction)}</p></figure>`;
    };
    return `<article class="retrieval-case"><header><h4>${escape(row.title)}</h4><span>${escape(row.execution.split.toUpperCase())} / ${row.execution.success?'SUCCESS':'NOT COMPLETED'}</span></header><div class="paired-clips">${clip('reference','RETRIEVED REFERENCE',row.reference.instruction)}${clip('execution','ROBODEMO-C15-WO',row.execution.instruction)}</div><p class="pair-identity">${escape(row.reference.uid)} &rarr; ${escape(row.execution.trial_id)}</p></article>`;
  }).join('');
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries) {
      const video=entry.target;
      if(entry.isIntersecting&&!video.getAttribute('src')) {
        video.src=video.dataset.pairSrc;video.preload='metadata';
      }
      if(!entry.isIntersecting)video.pause();
    }
  },{rootMargin:'100px 0px',threshold:.01});
  host.querySelectorAll('video').forEach(video=>observer.observe(video));
}
