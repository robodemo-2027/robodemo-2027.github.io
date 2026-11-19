import {escapeHTML} from './lib.js';

const palette={ink:'#49332f',muted:'#937a70',line:'#e8d5d0',paper:'#fffcf8',semantic:'#a892b2',spatial:'#c19745',process:'#dea7ba',rose:'#d86689'};
const text=(s,x,y,size=17,fill=palette.ink,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${escapeHTML(s)}</text>`;
const rect=(x,y,w,h,fill,stroke=palette.line,r=12)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
const grid=(x,y,n,cols,color,step=19,size=12,amount=1)=>Array.from({length:n},(_,i)=>rect(x+i%cols*step,y+Math.floor(i/cols)*step,size,size,color,'none',2).replace('<rect ',`<rect opacity="${i<n*amount?.9:.16}" `)).join('');
const path=(d,color=palette.muted,dash=false)=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="2" ${dash?'stroke-dasharray="5 5"':''} marker-end="url(#rf-arrow)"/>`;
const image=(href,x,y,w,h)=>`<image href="${escapeHTML(href)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
const particle=(points,t,color,count=5)=>Array.from({length:count},(_,i)=>{
  const u=((t+i/count)%1)*(points.length-1),j=Math.min(points.length-2,Math.floor(u)),f=u-j;
  return rect(points[j][0]+(points[j+1][0]-points[j][0])*f-4,points[j][1]+(points[j+1][1]-points[j][1])*f-4,8,8,color,'none',1);
}).join('');

export const retrievalStage=t=>Math.floor(((t%16)+16)%16/4);
export function retrievalSVG(seconds=0,images={}) {
  const t=((seconds%16)+16)%16,stage=retrievalStage(t),pulse=(t%4)/4;
  const media={query:'assets/media/retrieved-execution.jpg',reference:'assets/media/retrieved-reference.jpg',...images};
  const active=i=>i===stage?palette.rose:palette.line;
  const labels=['Observe the query','Encode complementary evidence','Compare candidate procedures','Preload the selected reference'];
  const lanes=[palette.semantic,palette.spatial,palette.process];
  const candidates=[0,1,2].map(i=>{
    const y=349+i*58,selected=stage>=2&&i===0;
    return rect(336,y,317,48,selected?'#f5e8ee':'#fff',selected?palette.rose:palette.line,7)
      +text(String(i+1).padStart(2,'0'),350,y+30,14)
      +lanes.map((color,k)=>grid(388+k*78,y+17,4,4,color,16,10)).join('')
      +(selected?text('1',630,y+31,18,palette.rose,'font-weight="700"'):'');
  }).join('');
  let tokens='';
  if(stage===0)tokens+=particle([[230,168],[271,168],[271,170],[313,170]],pulse,palette.semantic)
    +particle([[230,260],[271,260],[271,248],[313,248]],pulse,palette.spatial);
  if(stage===1)tokens+=particle([[645,170],[688,170],[688,227],[728,227]],pulse,palette.semantic)
    +particle([[645,248],[688,248],[688,252],[728,252]],pulse,palette.spatial)
    +particle([[654,374],[692,374],[692,290],[728,290]],pulse,palette.process);
  if(stage===2)tokens+=particle([[803,328],[803,420],[971,420],[971,180],[1020,180]],pulse,palette.rose,8);
  if(stage===3)tokens+=particle([[1114,270],[1114,375]],pulse,palette.semantic,4);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 590" width="1280" height="590" role="img" aria-label="Animated Refreward query and candidate token flow">
  <defs><marker id="rf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1 9 5 1 9" fill="none" stroke="${palette.muted}" stroke-width="1.5"/></marker></defs>
  <style>text{font-family:'Avenir Next',sans-serif}</style>
  ${rect(0,0,1280,590,palette.paper,'none')}
  ${text('REFREWARD / FROM A NEW SCENE TO A REFERENCE PROCEDURE',28,36,14,palette.muted)}
  ${text(labels[stage],28,74,27,palette.ink,'font-weight="600"')}
  ${rect(24,109,213,418,'#fff',active(0))}
  ${text('01 / QUERY',43,141,13,palette.muted)}
  ${image(media.query,45,163,170,160)}
  ${text('Initial observation',45,344,14)}
  ${rect(43,365,176,81,'#fbf5f0','none',7)}
  ${text('Instruction',55,388,13,palette.muted)}
  ${text('Fold the towel,',55,413,16)}
  ${text('then stow it.',55,434,16)}
  ${grid(49,473,8,8,palette.semantic,20,12)}
  ${path('M238 239H277V177H312')}
  ${path('M238 407H277V250H312')}
  ${rect(315,110,342,190,'#fff',active(1))}
  ${text('02 / FROZEN ENCODERS',336,140,13,palette.muted)}
  ${rect(334,155,139,49,'#f0e8f2','none',7)}
  ${text('Qwen3-VL',347,176,16)}
  ${text('semantics',347,194,12,palette.muted)}
  ${grid(498,165,14,7,palette.semantic,20,12)}
  ${rect(334,220,139,49,'#fff4d9','none',7)}
  ${text('DINOv3',347,242,16)}
  ${text('spatial appearance',347,259,12,palette.muted)}
  ${grid(498,230,14,7,palette.spatial,20,12)}
  ${text('ROBOT EPISODE BANK',336,328,13,palette.muted)}
  ${candidates}
  ${text('semantic',388,548,11,palette.semantic)}${text('spatial',466,548,11,palette.spatial)}${text('process',544,548,11,palette.process)}
  ${path('M658 178H690V224H728')}
  ${path('M658 248H728')}
  ${path('M658 432H691V288H728')}
  ${rect(730,172,170,156,'#fff6da',active(2))}
  ${text('03 / SCORE',748,202,13,palette.muted)}
  ${text('Refreward',748,234,22,palette.ink,'font-weight="600"')}
  ${grid(750,257,14,7,palette.rose,20,12)}
  ${text('query + candidate',747,311,13,palette.muted)}
  ${path('M816 329V421H973V200H1017')}
  ${text('Rank eligible',757,382,14,palette.muted)}
  ${text('procedures',765,403,14,palette.muted)}
  ${rect(1019,110,234,418,'#fff',active(3))}
  ${text('04 / TOP-1 VIDEO',1038,141,13,palette.muted)}
  ${image(media.reference,1038,162,192,158)}
  ${text('Selected robot reference',1038,343,14)}
  ${path('M1135 356V389',palette.semantic,true)}
  ${rect(1038,395,194,111,'#f0e8f2',palette.semantic,8)}
  ${text('Intent memory',1053,420,17)}
  ${grid(1055,437,24,8,palette.semantic,20,12,stage===3?.2+.8*pulse:0)}
  ${tokens}
  </svg>`;
}

export function initRetrievalMotion() {
  const host=document.querySelector('#retrieval-canvas'),box=document.querySelector('.retrieval-animation'),button=document.querySelector('#retrieval-motion');
  let playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,visible=false,time=0,last=0,painted=0;
  const descriptions=['Start with the initial image and the task instruction.','Encode semantics, spatial appearance and candidate procedure frames.','Refreward jointly scores the query and each eligible robot episode.','Preload the top-ranked video into demonstration-intent memory.'];
  function draw() {
    const stage=retrievalStage(time);host.innerHTML=retrievalSVG(time);box.dataset.stage=stage;
    document.querySelector('#retrieval-stage-text').textContent=descriptions[stage];
    button.textContent=playing?'Pause animation':'Play animation';button.setAttribute('aria-pressed',String(playing));
  }
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{threshold:.1}).observe(box);
  button.onclick=()=>{playing=!playing;draw();};
  function tick(now) {
    if(playing&&visible&&!document.hidden){time+=Math.min((now-last)/1000,.1);if(now-painted>65){draw();painted=now;}}
    last=now;requestAnimationFrame(tick);
  }
  draw();requestAnimationFrame(tick);
}
