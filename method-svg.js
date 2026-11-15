import {timeline} from './method-state.js';
import {COLORS,methodLayout,methodVisual,methodParticles,clamp} from './method-motion.js';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const text=(x,y,s,cls='',extra='')=>`<text x="${x}" y="${y}" class="${cls}" ${extra}>${esc(s)}</text>`;
const rect=(x,y,w,h,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const line=(points,cls='',id='')=>`<path ${id?`id="${id}"`:''} class="flow ${cls}" d="${points.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join(' ')}"/>`;
export const methodFrameURL=(kind,index)=>`assets/method/${kind}-${index}.jpg`;
export function matrixAlpha(amount,divisor,i){return amount<=0?0:clamp((.25+.65*amount/divisor)*(.78+(i%5)*.055));}

export function methodSVG(index=0,{mobile=false,source='robot',fraction=1,images={}}={}){
  const v=methodVisual(index,fraction,source),l=methodLayout(mobile),m=mobile;
  const image=(kind,n)=>images[`${kind}-${n}`]||methodFrameURL(kind,n);
  const photoURL=side=>image(side==='reference'?source==='human'?'human':'robot':'observation',side==='reference'?v.referenceFrame:v.observation);
  function photo(side,b){
    const [x,y,w,h]=b,ref=side==='reference',c=COLORS[side];
    return `<g id="method-photo-${side}">
      ${text(x,y-38,ref?'Learn the intent.':'Track the reality.','photo-title')}
      ${text(x,y-15,ref?(source==='human'?'HUMAN REFERENCE':'ROBOT DATASET REFERENCE'):'RECORDED EXECUTION','eyebrow')}
      ${rect(x+4,y+6,w,h,'#E8D5D0','rx="13" opacity=".45"')}
      ${rect(x,y,w,h,'#2D2427','rx="13"')}
      <g clip-path="url(#clip-${side})"><use href="#method-image-${side}" x="${x}" y="${y}"/>
      <g data-patch-grid="${side}" opacity="${(ref?v.tokenizeReference:v.tokenizeProgress)?'.8':'0'}">${[1,2,3].map(i=>`<path d="M${x+w*i/4} ${y}v${h}" stroke="${c}" stroke-width="1.4"/>`).join('')}<path d="M${x} ${y+h/2}h${w}" stroke="${c}" stroke-width="1.4"/></g>
      <rect data-scan="${side}" x="${x}" y="${y}" width="${w}" height="3" fill="${COLORS.action}" opacity="0"/>
      </g>
      ${text(x,y+h+24,ref?`Segment ${v.referenceFrame+1} / 4`:`Observation after step ${v.observation}`,'small',`id="method-image-label-${side}"`)}
    </g>`;
  }
  function encoder(side,b){
    const [x,y,w,h]=b,ref=side==='reference';
    return `${line([[x+w/2,l.refImage[1]+l.refImage[3]+31],[x+w/2,y-7]],side)}
      ${rect(x,y,w,h,ref?COLORS.referenceLight:COLORS.progressLight,'rx="23"')}
      ${text(x+w/2,y+20,ref?'Semantic + motion':'RGB + state + action','encoder','text-anchor="middle"')}
      ${text(x+w/2,y+35,ref?'Q-formers / fusion':'Q-former / SA-AdaLN','tiny','text-anchor="middle"')}
      ${line([[x+w/2,y+h],[x+w/2,(ref?l.refTokens:l.execTokens)[1]-11]],side)}`;
  }
  function memory(side,b){
    const [x,y,w,h]=b,ref=side==='reference',c=COLORS[side],amount=ref?v.referenceAmount:v.progressAmount,[cell,gap]=l.cells;
    const gx=x+(w-(gap*5+cell))/2,gy=y+(m?58:68);
    return `<g id="memory-${side}" data-memory="${side}" data-version="${ref?v.state.referenceVersion:v.state.executionVersion}">
      ${rect(x+12,y-18,w,h,'#FFFCF8',`rx="12" stroke="${c}" stroke-opacity=".32"`)}
      ${rect(x+6,y-9,w,h,ref?'#F0E8F2':'#FBE8EF',`rx="12" stroke="${c}" stroke-opacity=".45"`)}
      ${rect(x,y,w,h,'#FFFFFF',`rx="12" stroke="${c}" stroke-width="1.6"`)}
      ${rect(x,y,w,h,c,`rx="12" data-memory-wash="${side}" opacity="${amount>0?.09+.13*amount/(ref?4:8):0}"`)}
      ${text(x+13,y+26,ref?'Retrieval-TTT':'Execution-TTT','memory-title')}
      ${text(x+13,y+45,ref?'INTENT / PROTECTED':'PROGRESS / WRITABLE','eyebrow')}
      ${Array.from({length:24},(_,i)=>rect(gx+(i%6)*gap,gy+Math.floor(i/6)*gap,cell,cell,ref?'#F3EFF5':'#FBF4F6','rx="4"')+rect(gx+(i%6)*gap,gy+Math.floor(i/6)*gap,cell,cell,c,`rx="4" data-memory-cell="${side}" data-cell="${i}" fill-opacity="${matrixAlpha(amount,ref?4:8,i)}"`)).join('')}
      ${text(x+13,y+h-18,ref?(v.state.referenceFrozen?'Locked after preload':`${v.state.referenceVersion} / 4 segments written`):`${v.state.executionVersion} completed writes`,'small',`data-count="${side}"`)}
      ${rect(x-3,y-3,w+6,h+6,'none',`rx="15" stroke="${c}" stroke-width="3" data-write-glow="${side}" opacity="0"`)}
    </g>`;
  }
  function particle(p){
    const b=p.side==='reference'?l.refImage:l.execImage,i=p.index||0;
    const cx=b[2]*((i%4+.5)/4),cy=b[3]*(Math.floor(i/4)+.6)/2.2;
    return `<g data-moving="${p.id}" transform="translate(${p.x} ${p.y}) rotate(${p.rotation||0})" opacity="${p.opacity}">
      ${rect(-p.size/2+2,-p.size/2+3,p.size,p.size,'#49332F','rx="5" opacity=".15" data-token-shadow=""')}
      ${rect(-p.size/2,-p.size/2,p.size,p.size,p.fill,'rx="5" stroke="#FFFCF8" stroke-width="1.5" data-token-body=""')}
      ${p.side?`<svg aria-hidden="true" data-token-patch="" x="${-p.size/2}" y="${-p.size/2}" width="${p.size}" height="${p.size}" viewBox="${cx-22} ${cy-22} 44 44" opacity="${p.patch}" overflow="hidden"><use href="#method-image-${p.side}"/></svg>`:''}
      <text class="token-label" y="4">${p.label}</text></g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${l.width} ${l.height}" width="${l.width}" height="${l.height}" role="img" aria-label="Animated image patches become tokens and write into two independent TTT memories. Reference enters left in purple; completed execution enters right in pink." data-method-revision="warm-motion-v3">
    <title>${esc(timeline[index].title)}</title><desc>Real recorded images; tokens, tint, motion and matrices are teaching illustrations, not extracted activations or measured capacity. Reference stays fixed during rollout. Only completed interactions write progress. Action-side Q reads both memories serially.</desc>
    <defs>
      ${['reference','progress'].map(side=>{const b=side==='reference'?l.refImage:l.execImage;return `<image id="method-image-${side}" href="${photoURL(side)}" width="${b[2]}" height="${b[3]}" preserveAspectRatio="xMidYMid meet"/>`;}).join('')}
      <marker id="method-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#997F78"/></marker>
      <linearGradient id="method-action-mix"><stop stop-color="${COLORS.action}"/><stop offset=".48" stop-color="${COLORS.reference}"/><stop offset="1" stop-color="${COLORS.progress}"/></linearGradient>
      <linearGradient id="method-spectrum"><stop stop-color="#FFD968"/><stop offset=".42" stop-color="#EBB3C6"/><stop offset=".72" stop-color="#BCA5C3"/><stop offset="1" stop-color="#9B7865"/></linearGradient>
      <radialGradient id="method-halo"><stop stop-color="#FFE8A3" stop-opacity=".55"/><stop offset="1" stop-color="#FFFCF8" stop-opacity="0"/></radialGradient>
      ${['reference','progress'].map(side=>{const b=side==='reference'?l.refImage:l.execImage;return `<clipPath id="clip-${side}">${rect(...b,'white','rx="13"')}</clipPath>`;}).join('')}
    </defs>
    <style>
      .method-ink{font-family:'Source','Source Sans 3','Avenir Next',sans-serif;fill:#49332F;font-size:16px}
      .method-ink .photo-title{font-family:Space,'Avenir Next',sans-serif;font-size:${m?19:26}px;letter-spacing:-.7px;font-weight:550}
      .method-ink .eyebrow{font-size:${m?9.5:10.5}px;letter-spacing:.8px;fill:#8C716B}
      .method-ink .small{font-size:${m?12.5:13}px;fill:#806760}.method-ink .tiny{font-size:${m?10.5:11.5}px;fill:#8C716B}
      .method-ink .encoder{font-size:${m?14:16}px;font-weight:650}.method-ink .memory-title{font-size:${m?16:19}px;font-weight:650;letter-spacing:-.4px}
      .method-ink .flow{fill:none;stroke:#CAB6AE;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round;marker-end:url(#method-arrow)}
      .method-ink .write{stroke-dasharray:5 7;stroke-width:2.2}.method-ink .reference{stroke:${COLORS.reference}}.method-ink .progress{stroke:${COLORS.progress}}
      .method-ink .token-label{font-size:10px;fill:#49332F;font-weight:750;text-anchor:middle}
    </style>
    <g class="method-ink">
      ${rect(0,0,l.width,l.height,COLORS.paper)}
      <ellipse cx="${m?190:598}" cy="${m?460:260}" rx="${m?230:430}" ry="${m?270:265}" fill="url(#method-halo)"/>
      ${text(m?20:34,32,source==='human'?'OBSERVE  /  TOKENIZE  /  REMEMBER':m?'RGB + TEXT → BANK → REFERENCE':'INITIAL RGB + INSTRUCTION → ROBOT TRAINING BANK → REFERENCE','eyebrow',source==='robot'?'id="path-query"':'')}
      ${rect(m?20:34,45,m?350:1132,3,'url(#method-spectrum)','rx="1.5"')}
      ${photo('reference',l.refImage)}${photo('progress',l.execImage)}
      ${encoder('reference',l.refEncoder)}${encoder('progress',l.execEncoder)}
      ${['reference','progress'].map(side=>{const [x,y,gap]=side==='reference'?l.refTokens:l.execTokens;return Array.from({length:8},(_,i)=>rect(x+i*gap,y,18,18,COLORS[side],'rx="4" opacity=".16"')).join('')+text(x,y+39,side==='reference'?'8 shown / 32 ref. tokens':'8 shown / 16 prog. tokens','small');}).join('')}
      ${text(m?26:403,m?423:129,'DUAL TTT LAYERS','eyebrow')}
      ${m?'':text(403,153,'Two fast states. Not a video cache.','small')}
      ${memory('reference',l.reference)}${memory('progress',l.progress)}
      ${line(l.writeR,'write reference','path-reference-write')}${line(l.writeE,'write progress','path-progress-write')}
      ${m?'':text(348,270,'K/V','tiny')+text(826,270,'K/V','tiny')}
      ${text(m?195:603,m?670:447,'INNER UPDATE / NO CROSS-WRITE','eyebrow','text-anchor="middle"')}
      ${m?'':text(34,544,'ACTION','eyebrow')+text(34,563,'RGB + state + text','tiny')}
      ${text(m?26:201,m?692:498,m?'READ BOTH, IN ORDER':'ONE ACTION BLOCK / SERIAL READS','eyebrow')}
      ${line(l.readPath,'','path-action-serial')}
      ${[l.attention,l.rRead,l.eRead,l.ffn].map((b,i)=>rect(...b,i===1?COLORS.referenceLight:i===2?COLORS.progressLight:'#FFF3CE','rx="22"')+text(b[0]+b[2]/2,b[1]+b[3]/2+5,['Attention','Read intent','Read progress','FFN'][i],'encoder','text-anchor="middle"')).join('')}
      ${line(m?[[102,645],[192,645],[192,748],[103,748],[103,762]]:[[495,412],[495,473],[447,473],[447,525]],'reference','path-reference-read')}
      ${line(m?[[286,645],[376,645],[376,782],[363,782]]:[[710,412],[710,474],[647,474],[647,525]],'progress','path-progress-read')}
      ${[l.prediction,l.execution].map((b,i)=>rect(...b,i?'#F4E9DF':'#FFE8A3','rx="12"')+text(b[0]+b[2]/2,b[1]+23,i?'Execute':'Action chunk','encoder','text-anchor="middle"')+(i?text(b[0]+b[2]/2,b[1]+41,'then observe','tiny','text-anchor="middle"'):'')).join('')}
      ${line(m?[[287,741],[376,741],[376,823],[287,823],[287,837]]:[[848,547],[887,547]])}
      ${line(m?[[210,862],[179,862]]:[[1017,547],[1050,547]])}
      ${line(l.returnPath,'progress','path-observation-return')}
      ${text(m?20:34,m?915:610,m?'Real images. Illustrative tokens and memory tint.':'Real source images. Tokens, matrix tint and animation timing are explanatory, not measured activations.','small')}
      ${text(m?20:34,m?932:629,source==='human'?(m?'Same selected reference / execution case.':'Reference and execution belong to the same selected case. Reference fast weights stay protected.'):m?'Dataset reference; no linked rollout claimed.':'Robot input is a dataset example, not the reference for this human-conditioned rollout.','tiny')}
      <g id="method-particles">${methodParticles(v,l).map(particle).join('')}</g>
      <rect data-stage-progress="" x="0" y="${l.height-2}" width="${v.f*l.width}" height="2" fill="url(#method-spectrum)"/>
    </g></svg>`;
}

export function bindMethodMotion(host,{mobile=false,source='robot'}={}){
  const l=methodLayout(mobile),nodes=new Map([...host.querySelectorAll('[data-moving]')].map(n=>[n.dataset.moving,n]));
  const matrices=Object.fromEntries(['reference','progress'].map(side=>[side,[...host.querySelectorAll(`[data-memory-cell="${side}"]`)]]));
  const grids=Object.fromEntries(['reference','progress'].map(side=>[side,host.querySelector(`[data-patch-grid="${side}"]`)]));
  let oldFrames={};
  return(index,fraction)=>{
    const v=methodVisual(index,fraction,source);
    for(const p of methodParticles(v,l)){
      const node=nodes.get(p.id),r=node.querySelector('[data-token-body]'),shadow=node.querySelector('[data-token-shadow]'),patch=node.querySelector('[data-token-patch]');
      node.setAttribute('transform',`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${(p.rotation||0).toFixed(1)})`);node.setAttribute('opacity',p.opacity);
      r.setAttribute('fill',p.fill);
      for(const el of [r,patch,shadow].filter(Boolean)){el.setAttribute('width',p.size);el.setAttribute('height',p.size);el.setAttribute('x',-p.size/2+(el===shadow?2:0));el.setAttribute('y',-p.size/2+(el===shadow?3:0));}
      if(patch)patch.setAttribute('opacity',p.patch);
      node.lastElementChild.textContent=p.label;
    }
    for(const side of ['reference','progress']){
      const ref=side==='reference',amount=ref?v.referenceAmount:v.progressAmount,count=ref?v.state.referenceVersion:v.state.executionVersion,active=ref?v.tokenizeReference:v.tokenizeProgress;
      matrices[side].forEach((n,i)=>n.setAttribute('fill-opacity',matrixAlpha(amount,ref?4:8,i)));
      host.querySelector(`[data-memory="${side}"]`).dataset.version=count;
      host.querySelector(`[data-memory-wash="${side}"]`).setAttribute('opacity',amount>0?.09+.13*amount/(ref?4:8):0);
      host.querySelector(`[data-count="${side}"]`).textContent=ref?(v.state.referenceFrozen?'Locked after preload':`${count} / 4 segments written`):`${count} completed writes`;
      const grid=grids[side];grid.setAttribute('opacity',active?.7*(1-v.local):0);
      host.querySelector(`[data-write-glow="${side}"]`).setAttribute('opacity',v.active===side?Math.sin(Math.PI*clamp((v.local-.62)/.36))*.5:0);
      const scan=host.querySelector(`[data-scan="${side}"]`),b=ref?l.refImage:l.execImage;
      scan.setAttribute('y',b[1]+(b[3]-3)*v.f);scan.setAttribute('opacity',ref&&['query','retrieve'].includes(v.phase)?.8:0);
      const frame=ref?v.referenceFrame:v.observation,kind=ref?source==='human'?'human':'robot':'observation';
      if(oldFrames[side]!==frame){
        const url=methodFrameURL(kind,frame);host.querySelector(`#method-image-${side}`).setAttribute('href',url);
        host.querySelectorAll(`[data-patch-image="${side}"]`).forEach(el=>el.setAttribute('href',url));
        host.querySelector(`#method-image-label-${side}`).textContent=ref?`Segment ${frame+1} / 4`:`Observation after step ${frame}`;
        oldFrames[side]=frame;
      }
    }
    host.querySelector('[data-stage-progress]').setAttribute('width',v.f*l.width);
    host.dataset.state=JSON.stringify(v.state);host.dataset.playhead=String(fraction);
    return v;
  };
}
