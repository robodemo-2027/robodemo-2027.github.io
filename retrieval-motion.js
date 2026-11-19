import {escapeHTML} from './lib.js';
import {COLORS,clamp} from './method-motion.js';

const C={...COLORS,muted:'#8C716B',spatial:'#C19745'};
const rect=(x,y,w,h,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const text=(x,y,s,cls='',extra='')=>`<text x="${x}" y="${y}" class="${cls}" ${extra}>${escapeHTML(s)}</text>`;
const route=(points,kind='')=>`<path class="rr-flow ${kind}" d="${points.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join(' ')}"/>`;
const ease=t=>{const f=clamp(t);return f*f*(3-2*f);};
export const retrievalStage=t=>Math.floor(((t%16)+16)%16/4);
export const retrievalState=seconds=>{
  const time=((seconds%16)+16)%16,stage=retrievalStage(time),fraction=time%4/4;
  return {stage,fraction,selected:stage>=2,memory:stage===3?ease((fraction-.35)/.55):0};
};
function at(points,f){
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
  let d=clamp(f)*lengths.reduce((a,b)=>a+b,0);
  for(let i=0;i<lengths.length;i++){if(d<=lengths[i]||i===lengths.length-1){const u=d/lengths[i];return [points[i][0]+(points[i+1][0]-points[i][0])*u,points[i][1]+(points[i+1][1]-points[i][1])*u];}d-=lengths[i];}
}
function token(x,y,color,size=18,opacity=1,patch=''){
  return `<g class="rr-token" transform="translate(${x} ${y})" opacity="${opacity}">${rect(-size/2+2,-size/2+3,size,size,C.ink,'rx="4" opacity=".13"')}${rect(-size/2,-size/2,size,size,color,'rx="4" stroke="#FFFCF8" stroke-width="1.5"')}${patch}</g>`;
}
function stream(points,f,color,n=6){return Array.from({length:n},(_,i)=>{const u=clamp(f*1.6-i*.1),[x,y]=at(points,ease(u));return token(x,y,color,18,u>0&&u<1?1:0);}).join('');}
const grid=(x,y,n,cols,color,gap=23,amount=1)=>Array.from({length:n},(_,i)=>rect(x+i%cols*gap,y+Math.floor(i/cols)*gap,16,16,color,`rx="4" opacity="${i/n<amount?.85:.14}"`)).join('');

export function retrievalSVG(seconds=0,images={},options={}){
  const {stage,fraction:f,selected,memory}=retrievalState(seconds),mobile=options.mobile||false;
  const media={query:'assets/retrieval/query.jpg',...Object.fromEntries([0,1,2,3].map(i=>['reference-'+i,`assets/retrieval/reference-${i}.jpg`])),...images};
  const frame=stage<2?0:Math.min(3,Math.floor((stage-2+f)*2));
  const ref=media['reference-'+frame]||media.reference;
  const labels=['Encode the scene.','Compare the procedures.','Select one reference.','Remember the intent.'];
  const query=[34,126,270,174],output=[896,126,270,174];
  const image=(href,b,id)=>`<image id="${id}" href="${escapeHTML(href)}" x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" preserveAspectRatio="xMidYMid meet"/>`;
  const photo=(b,href,id)=>rect(b[0]+4,b[1]+6,b[2],b[3],C.neutral,'rx="13" opacity=".45"')+rect(...b,'#2D2427','rx="13"')+`<g clip-path="url(#${id}-clip)">${image(href,b,id)}</g>`;
  const queryPath=[[170,522],[350,522],[350,438],[414,438]];
  const candidatePath=[[588,364],[588,406]];
  const selectPath=[[766,438],[850,438],[850,213],[890,213]];
  const writePath=[[1142,370],[1176,370],[1176,548],[1136,548]];
  let moving='';
  if(stage===0)for(let i=0;i<8;i++){
    const start=[68+i%4*64,165+Math.floor(i/4)*76],end=[96+(i%2)*146,421];
    const u=ease(clamp((f-i*.045)*1.9)),[x,y]=at([start,[start[0],322],[end[0],322],end],u),size=30-12*u;
    const patch=u<.75?`<svg x="${-size/2}" y="${-size/2}" width="${size}" height="${size}" viewBox="${start[0]-25} ${start[1]-25} 50 50" opacity="${1-u/.75}"><use href="#rr-query"/></svg>`:'';
    moving+=token(x,y,i%2?C.spatial:C.reference,size,u>0&&u<1?1:0,patch);
  }
  if(stage===1){moving+=stream(queryPath,f,C.reference)+stream(queryPath,(f+.15)%1,C.spatial,3)+stream(candidatePath,(f+.3)%1,C.progress,5);}
  if(stage===2)moving+=stream(selectPath,f,C.action,5);
  if(stage===3)moving+=stream(writePath,f,C.reference,8);
  const cards=[0,1,2].map(i=>{
    const y=154+i*70,active=(stage===1&&Math.min(2,Math.floor(f*3))===i)||(selected&&i===1);
    return `<g data-candidate="${i}" data-selected="${selected&&i===1}">${rect(405,y,363,54,active?C.referenceLight:'#FFFFFF',`rx="10" stroke="${active?C.reference:C.neutral}" stroke-width="${active?2:1}"`)}${text(420,y+21,`PROCEDURE 0${i+1}`,'rr-eyebrow')}${text(420,y+40,selected&&i===1?'Selected reference':'Robot episode','rr-small')}${grid(570,y+11,8,4,C.reference,22)}${grid(670,y+11,8,4,C.progress,22)}</g>`;
  }).join('');
  // Reuse one geometry and stack its semantic groups at the mobile breakpoint.
  const wrap=(name,content)=>`<g data-region="${name}" transform="${mobile?({query:'translate(-8 0)',bank:'translate(-389 435)',output:'translate(-870 970)'})[name]:''}">${content}</g>`;
  const connectors=mobile?'':route(queryPath,'rr-reference')+route(candidatePath,'rr-progress')+route(selectPath);
  const mobileFlow=mobile?route([[195,523],[195,572]])+route([[195,915],[195,1059]]):'';
  const body=wrap('query',text(34,93,'Observe the query.','rr-photo-title')+text(34,113,'INITIAL RGB + INSTRUCTION','rr-eyebrow')+photo(query,media.query,'rr-query')
    +(stage===0?`<g opacity="${1-f*.6}">${[1,2,3].map(i=>`<path d="M${34+i*67.5} 126V300" stroke="${C.reference}"/>`).join('')}<path d="M34 213H304" stroke="${C.reference}"/></g>`:'')
    +rect(34,328,270,54,'#F6EDE6','rx="10"')+text(48,349,'Hang the mug','rr-label')+text(48,370,'on the rack.','rr-label')
    +route([[102,302],[102,326]])+route([[102,383],[102,397]])
    +route([[304,213],[323,213],[323,390],[240,390],[240,397]])
    +rect(34,400,128,44,C.referenceLight,'rx="22"')+text(98,426,'Qwen3-VL','rr-label','text-anchor="middle"')
    +rect(176,400,128,44,'#FFF3CE','rx="22"')+text(240,426,'DINOv3','rr-label','text-anchor="middle"')
    +text(48,469,'SEMANTIC','rr-eyebrow')+text(193,469,'SPATIAL','rr-eyebrow')+grid(48,481,4,4,C.reference)+grid(193,481,4,4,C.spatial)
    +(mobile?'':route([[93,503],[93,522],[170,522]],'rr-reference')+route([[239,503],[239,522],[170,522]])))
    +wrap('bank',text(405,112,'ROBOT DEMONSTRATION BANK','rr-eyebrow')+rect(417,132,363,220,'#FFFCF8',`rx="12" stroke="${C.reference}" opacity=".35"`)+rect(411,140,363,220,C.referenceLight,`rx="12" stroke="${C.reference}" opacity=".6"`)+cards
    +rect(415,406,350,74,'#FFF3CE',`rx="14" stroke="${stage===1?C.action:C.neutral}"`)+text(435,437,'Refreward','rr-memory-title')+text(435,461,'Joint query / candidate scoring','rr-small')+grid(638,423,10,5,C.progress,22)
    +text(415,513,'Rank compatible procedures.','rr-small'))
    +wrap('output',text(896,93,'Keep the procedure.','rr-photo-title')+text(896,113,'SELECTED ROBOT REFERENCE','rr-eyebrow')+photo(output,ref,'rr-reference')
    +text(896,324,selected?`Reference frame ${frame+1} / 4`:'Waiting for selection','rr-small')
    +route([[1030,330],[1030,345]],'rr-reference')+rect(919,348,222,44,C.referenceLight,'rx="22"')+text(1030,367,'Semantic + motion','rr-label','text-anchor="middle"')+text(1030,383,'Q-formers / fusion','rr-tiny','text-anchor="middle"')
    +rect(918,420,234,178,'#FFFCF8',`rx="12" stroke="${C.reference}" opacity=".45"`)+rect(912,429,234,178,C.referenceLight,`rx="12" stroke="${C.reference}" opacity=".7"`)+rect(906,438,234,178,'#FFFFFF',`rx="12" stroke="${C.reference}" stroke-width="1.6"`)
    +text(922,465,'Retrieval-TTT','rr-memory-title')+text(922,485,memory>=.99?'INTENT / PROTECTED':'DEMONSTRATION INTENT','rr-eyebrow')+grid(922,504,32,8,C.reference,25,memory)
    +route(writePath,'rr-reference rr-write'))
    +connectors+mobileFlow+(mobile?(stage===0?`<g transform="translate(-8 0)">${moving}</g>`:stage===3?`<g transform="translate(-870 970)">${moving}</g>`:stream(stage===1?[[195,519],[195,577]]:[[195,915],[195,1059]],f,stage===1?C.reference:C.action)):moving);
  const h=mobile?1620:640,w=mobile?390:1200;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Animated Refreward query and candidate token flow" data-retrieval-revision="method-matched-v2"><defs><marker id="rr-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#997F78"/></marker><linearGradient id="rr-spectrum"><stop stop-color="#FFD968"/><stop offset=".42" stop-color="#EBB3C6"/><stop offset=".72" stop-color="#BCA5C3"/><stop offset="1" stop-color="#9B7865"/></linearGradient><radialGradient id="rr-halo"><stop stop-color="#FFE8A3" stop-opacity=".55"/><stop offset="1" stop-color="#FFFCF8" stop-opacity="0"/></radialGradient><clipPath id="rr-query-clip">${rect(...query,'white','rx="13"')}</clipPath><clipPath id="rr-reference-clip">${rect(...output,'white','rx="13"')}</clipPath></defs><style>.rr-ink{font-family:Source,'Source Sans 3','Avenir Next',sans-serif;fill:${C.ink}}.rr-ink .rr-photo-title{font-family:Space,'Space Grotesk','Avenir Next',sans-serif;font-size:26px;letter-spacing:-.7px;font-weight:550}.rr-ink .rr-eyebrow{font-size:10.5px;letter-spacing:.8px;fill:${C.muted}}.rr-ink .rr-small{font-size:13px;fill:#806760}.rr-ink .rr-tiny{font-size:11.5px;fill:${C.muted}}.rr-ink .rr-label{font-size:16px;font-weight:650}.rr-ink .rr-memory-title{font-size:19px;font-weight:650;letter-spacing:-.4px}.rr-ink .rr-flow{fill:none;stroke:#CAB6AE;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round;marker-end:url(#rr-arrow)}.rr-ink .rr-reference{stroke:${C.reference}}.rr-ink .rr-progress{stroke:${C.progress}}.rr-ink .rr-write{stroke-dasharray:5 7;stroke-width:2.2}</style><g class="rr-ink">${rect(0,0,w,h,C.paper)}<ellipse cx="${w/2}" cy="260" rx="430" ry="265" fill="url(#rr-halo)"/>${text(34,32,labels[stage].toUpperCase(),'rr-eyebrow')}${rect(34,45,w-68,3,'url(#rr-spectrum)','rx="1.5"')}${body}${rect(0,h-2,w*(stage+f)/4,2,'url(#rr-spectrum)')}</g></svg>`;
}

export function initRetrievalMotion(){
  const host=document.querySelector('#retrieval-canvas'),box=document.querySelector('.retrieval-animation'),button=document.querySelector('#retrieval-motion');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),small=matchMedia('(max-width: 680px)');
  let playing=!reduced.matches,visible=false,time=0,last=0,painted=0;
  const descriptions=['The initial image and instruction become semantic and spatial tokens.','Query tokens meet candidate procedure tokens in the shared scorer.','The selected robot video supplies the reference procedure.','Reference tokens write once into protected demonstration-intent memory.'];
  function draw(){const stage=retrievalStage(time);host.innerHTML=retrievalSVG(time,{}, {mobile:small.matches});box.dataset.stage=stage;document.querySelector('#retrieval-stage-text').textContent=descriptions[stage];button.textContent=playing?'Pause animation':'Play animation';button.setAttribute('aria-pressed',String(playing));}
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{threshold:.05}).observe(box);
  button.onclick=()=>{playing=!playing;draw();};
  document.querySelector('#retrieval-restart').onclick=()=>{time=0;draw();};
  for(const [i,b] of [...document.querySelectorAll('.retrieval-stages button')].entries())b.onclick=()=>{time=i*4;draw();};
  small.addEventListener('change',draw);
  function tick(now){if(playing&&visible&&!document.hidden){time+=Math.min((now-last)/1000,.1);if(now-painted>32){draw();painted=now;}}last=now;requestAnimationFrame(tick);}
  draw();requestAnimationFrame(tick);
}
