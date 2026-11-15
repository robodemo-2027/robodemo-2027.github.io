import {initialState,stateAt,timeline} from './method-state.js';
export const METHOD_SECONDS=3.2;
export const COLORS={reference:'#BCA5C3',referenceLight:'#F0E8F2',progress:'#D86689',progressLight:'#FBE8EF',action:'#FFD968',neutral:'#E8D5D0',ink:'#49332F',paper:'#FFFCF8'};
export const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};

// Counts commit only after particles arrive. Tint is a teaching cue, not measured weights.
export function methodVisual(index,fraction=1,source='robot'){
  const phase=timeline[index].phase,f=clamp(fraction);
  const before=index?stateAt(index-1,source):{...initialState(),source};
  const after=stateAt(index,source),s=structuredClone(before);
  s.phase=phase;
  let active='none',writeFraction=0,cycle=0;
  if(phase==='preload'){
    active='reference';writeFraction=smooth((f-.68)/.22);
    if(f>=.9)s.referenceVersion=after.referenceVersion;
  }else if(phase==='write'){
    active='progress';writeFraction=smooth((f-.68)/.22);
    if(f>=.9)Object.assign(s,after);
  }else if(phase==='advance'){
    cycle=Math.min(2,Math.floor(f*3));
    active='progress';writeFraction=smooth(((f*3-cycle)-.68)/.22);
    const committed=Math.min(3,Math.floor(f*3)+((f*3%1)>=.9?1:0));
    s.completed=[...before.completed,...Array.from({length:committed},(_,i)=>before.controlStep+i+1)];
    s.committed=[...before.committed,...Array.from({length:committed},(_,i)=>before.controlStep+i+1)];
    s.controlStep=before.controlStep+committed;s.executionVersion=before.executionVersion+committed;
  }else if(f>=.65||!['complete','freeze'].includes(phase))Object.assign(s,after);
  if(f===1)Object.assign(s,after);
  const local=phase==='advance'?Math.min(1,f===1?1:f*3-cycle):f;
  const referenceAmount=phase==='preload'?before.referenceVersion+writeFraction:s.referenceVersion;
  const progressAmount=phase==='write'?before.executionVersion+writeFraction:phase==='advance'?Math.min(after.executionVersion,before.executionVersion+cycle+writeFraction):s.executionVersion;
  const referenceFrame=phase==='preload'?timeline[index].value-1:index>=7?3:phase==='encode'?Math.min(3,Math.floor(f*4)):0;
  let observation=before.controlStep;
  if(phase==='complete')observation=f>.55?after.pending:before.controlStep;
  else if(phase==='write')observation=after.controlStep;
  else if(phase==='advance')observation=Math.min(8,before.controlStep+cycle+(local>.3?1:0));
  else if(index>=8)observation=s.controlStep;
  return {phase,f,local,state:s,active,referenceAmount,progressAmount,referenceFrame,observation,
    tokenizeReference:phase==='encode'||phase==='preload',tokenizeProgress:phase==='write'||phase==='advance',
    read:['read','denoise','continue'].includes(phase),predicted:phase==='predict'||phase==='execute',
    executed:['execute','complete','advance'].includes(phase)};
}
export function methodLayout(mobile=false){
  if(mobile)return{
    width:390,height:940,
    refImage:[20,112,166,126],execImage:[204,112,166,126],
    refEncoder:[20,284,166,42],execEncoder:[204,284,166,42],
    refTokens:[24,354,20],execTokens:[208,354,20],
    memory:[20,426,350,238],reference:[26,458,153,187],progress:[210,458,153,187],
    cells:[16,21],attention:[26,701,153,40],rRead:[26,762,153,40],eRead:[210,762,153,40],ffn:[210,701,153,40],
    prediction:[210,837,153,50],execution:[26,837,153,50],
    writeR:[[24,363],[8,363],[8,554],[42,554]],writeE:[[366,363],[382,363],[382,554],[347,554]],
    readPath:[[103,721],[103,782],[287,782],[287,721]],
    returnPath:[[26,862],[5,862],[5,253],[287,253],[287,238]]
  };
  return{
    width:1200,height:640,
    refImage:[34,126,270,174],execImage:[896,126,270,174],
    refEncoder:[58,354,222,46],execEncoder:[920,354,222,46],
    refTokens:[55,432,29],execTokens:[926,432,29],
    memory:[380,110,440,346],reference:[403,187,184,225],progress:[619,187,184,225],
    cells:[20,26],attention:[201,525,129,44],rRead:[365,525,164,44],eRead:[565,525,164,44],ffn:[766,525,82,44],
    prediction:[887,517,130,60],execution:[1050,517,116,60],
    writeR:[[271,441],[331,441],[331,284],[418,284]],writeE:[[934,441],[867,441],[867,284],[787,284]],
    readPath:[[154,547],[267,547],[447,547],[647,547],[807,547],[864,547]],
    returnPath:[[1108,517],[1108,487],[1182,487],[1182,213],[1166,213]]
  };
}
export function along(points,t){
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
  let remaining=clamp(t)*lengths.reduce((a,b)=>a+b,0);
  for(let i=0;i<lengths.length;i++){
    if(remaining<=lengths[i]||i===lengths.length-1){
      const f=lengths[i]?remaining/lengths[i]:1;
      return[points[i][0]+(points[i+1][0]-points[i][0])*f,points[i][1]+(points[i+1][1]-points[i][1])*f];
    }
    remaining-=lengths[i];
  }
  return points[0];
}
export function methodParticles(v,l){
  const out=[];
  for(const side of ['reference','progress']){
    const ref=side==='reference',on=ref?v.tokenizeReference:v.tokenizeProgress;
    const image=ref?l.refImage:l.execImage,encoder=ref?l.refEncoder:l.execEncoder,tokens=ref?l.refTokens:l.execTokens;
    for(let i=0;i<8;i++){
      const phase=ref?v.f:v.local,lag=i*.01;
      const split=smooth((phase-lag)/.4),travel=smooth((phase-.40-lag)/.38);
      const start=[image[0]+image[2]*((i%4+.5)/4),image[1]+image[3]*(Math.floor(i/4)+.6)/2.2];
      const token=[tokens[0]+i*tokens[2]+8,tokens[1]+9],enc=[encoder[0]+encoder[2]/2,encoder[1]+encoder[3]/2];
      const xy=phase<.4+lag?along([start,enc,token],split):v.active===side?along([token,...(ref?l.writeR:l.writeE)],travel):token;
      const patch=1-smooth((phase-.12-lag)/.20);
      out.push({id:`${side}-${i}`,side,index:i,x:xy[0],y:xy[1],opacity:on&&phase>lag&&phase<.94?1:0,size:20+patch*(l.width<500?14:24),patch,rotation:(1-split)*(i%2?9:-9),fill:COLORS[side],label:phase>.30?String(i+1):''});
    }
  }
  const q=v.phase==='denoise'?(v.f===1?1:(v.f*3)%1):v.f;
  const pos=along(l.readPath,q),fill=q<.33?COLORS.action:q<.66?COLORS.reference:'url(#method-action-mix)';
  out.push({id:'action-read',x:pos[0],y:pos[1],size:25,opacity:v.read&&v.f<.98?1:0,fill,label:'Q'});
  const ret=along(l.returnPath,smooth(v.local));
  out.push({id:'executed-return',x:ret[0],y:ret[1],size:12,opacity:v.executed&&v.local<.96?1:0,fill:COLORS.progress,label:''});
  for(let i=0;i<5;i++)out.push({id:`prediction-${i}`,x:l.prediction[0]+19+i*22,y:l.prediction[1]+43,size:10,opacity:v.predicted&&v.f>i*.13?1:0,fill:COLORS.action,label:''});
  return out;
}
