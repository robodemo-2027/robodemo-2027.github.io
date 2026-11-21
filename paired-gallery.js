import {escapeHTML as escape} from './lib.js';
import {streamingSources} from './content/streaming-media.js';

export function pairedGalleryMarkup(rows,lang='en') {
  const text=([en,zh])=>lang==='zh'?zh:en;
  // The site's language switch writes dataset strings through innerHTML.
  const translated=(tag,labels)=>`<${tag} data-en="${escape(escape(labels[0]))}" data-zh="${escape(escape(labels[1]))}">${escape(text(labels))}</${tag}>`;
  return rows.map(row=>{
    const clip=kind=>{
      const media=row[kind];
      const src=streamingSources[media.src]?.src||media.src;
      return `<figure>${translated('figcaption',media.label)}
        <video controls muted playsinline preload="none" src="${escape(src)}" poster="${escape(media.poster)}" data-identity="${escape(media.identity)}" aria-label="${escape(text(row.title)+' / '+text(media.label))}"></video>
        <p class="video-error" role="status" hidden>${translated('span',['This recording could not load.','此录像暂时无法加载。'])} <a href="${escape(src)}" target="_blank" rel="noopener">${translated('span',['Open video file','打开视频文件'])}</a></p>
        <p>${escape(media.instruction)}</p></figure>`;
    };
    return `<article class="retrieval-case" data-outcome="success" data-case="${escape(row.key)}">
      <header>${translated('h4',row.title)}${translated('span',row.status)}</header>
      <div class="paired-clips">${clip('reference')}${clip('execution')}</div>
      <p class="pair-identity">${escape(row.reference.identity)} &rarr; ${escape(row.execution.identity)}</p>
    </article>`;
  }).join('');
}

export function mountPairedGallery(selector,rows,countSelector) {
  const host=document.querySelector(selector),count=document.querySelector(countSelector);
  const lang=document.documentElement.lang;
  host.innerHTML=pairedGalleryMarkup(rows,lang);
  count.dataset.en=`${rows.length} SUCCESSFUL CASES`;
  count.dataset.zh=`${rows.length} 个成功案例`;
  count.textContent=count.dataset[lang==='zh'?'zh':'en'];
  for(const video of host.querySelectorAll('video')){
    const error=video.parentElement.querySelector('.video-error');
    video.addEventListener('error',()=>{error.hidden=false;});
    video.addEventListener('loadeddata',()=>{error.hidden=true;});
  }
  // Translate labels in place so playback, buffered data and native controls survive.
  document.addEventListener('languagechange',()=>{
    for(const video of host.querySelectorAll('video')){
      const title=video.closest('article').querySelector('h4').textContent;
      const label=video.parentElement.querySelector('figcaption').textContent;
      video.setAttribute('aria-label',`${title} / ${label}`);
    }
  });
}
