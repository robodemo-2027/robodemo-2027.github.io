import {$,$$,tr,loadJSON} from './lib.js';
import {initMethod} from './method.js';
import {initMethodDetails} from './method-details.js';
import {initPerformance} from './performance.js';
import {initRelease} from './release-2026.js?v=20261119-recut';
import {initDemos} from './demos.js?v=20261121-native-stream';
import {publication} from './content/config.js';
import {initSummaryFilm} from './summary-film.js';
import {initRetrievalGallery} from './retrieval-gallery.js?v=20261121-native-stream';
import {initEvaluationStarter} from './evaluation-starter.js?v=20261120-release';
function language(lang){
  document.documentElement.lang=lang;
  $$('[data-en][data-zh]').forEach(el=>el.innerHTML=el.dataset[lang==='zh'?'zh':'en']);
  $('#language').textContent=lang==='zh'?'EN':'中文';
  $('#language').setAttribute('aria-label',lang==='zh'?'Switch to English':'Switch to Chinese');
  try{localStorage.setItem('robodemo-language',lang);}catch{}
  document.dispatchEvent(new Event('languagechange'));
}
let saved='en';try{saved=localStorage.getItem('robodemo-language')||'en';}catch{}
language(saved);
$('#language').onclick=()=>language(document.documentElement.lang==='en'?'zh':'en');
$('#menu-toggle').onclick=()=>{const open=$('.nav').classList.toggle('open');$('#menu-toggle').setAttribute('aria-expanded',String(open));};
$$('#nav-links a').forEach(a=>a.onclick=()=>{$('.nav').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){$('.nav').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');}});
const navIO=new IntersectionObserver(es=>{
  const visible=es.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
  if(visible)$$('#nav-links a').forEach(a=>a.setAttribute('aria-current',String(a.hash===`#${visible.target.id}`)));
},{rootMargin:'-15% 0px -60% 0px',threshold:0});
$$('main>section').forEach(s=>navIO.observe(s));
initMethod();
initMethodDetails();
const status=$('#app-status');
function error(err){status.hidden=false;status.textContent=tr('Resource failed to load: ','资源加载失败：')+err.message;}
async function boot(){
  const results=await Promise.allSettled([
    loadJSON('data/full50.json').then(initPerformance),
    loadJSON('data/demos.json').then(initDemos),
    initRetrievalGallery()
  ]);
  results.filter(x=>x.status==='rejected').forEach(x=>error(x.reason));
}
boot();
initRelease();
initSummaryFilm();
initEvaluationStarter();
const lazyIO=new IntersectionObserver(es=>es.forEach(en=>{
  const v=en.target;if(en.isIntersecting&&v.dataset.lazySrc&&!v.getAttribute('src')){v.src=v.dataset.lazySrc;v.preload='metadata';}
  if(!en.isIntersecting)v.pause();
}),{threshold:.05});
$$('video[data-lazy-src]').forEach(v=>lazyIO.observe(v));
if(location.protocol==='file:'){status.hidden=false;status.textContent='Use npm start and the local HTTP preview. file:// cannot load the data modules.';}
