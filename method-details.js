import {$,$$,escapeHTML as e,tr,reduced} from './lib.js';
import {detailSteps,detailFrame,detailClockState,detailPresentation,advanceDetail,encodingSamples,encodingSampleFrame,encodingSamplePosition,encodingFlowFrame} from './method-detail-model.js';

const text=pair=>pair[document.documentElement.lang==='zh'?1:0];
const mobileAttributes=['transform','d','x','y','cx','cy','width','height'];

async function loadDiagram(host){
  const url=new URL(host.dataset.scene,document.baseURI);
  const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error(`SVG ${response.status}`);
  const parsed=new DOMParser().parseFromString(await response.text(),'image/svg+xml');
  if(parsed.querySelector('parsererror'))throw new Error('Invalid SVG');
  const svg=document.importNode(parsed.documentElement,true);
  for(const image of $$('image',svg)){
    const href=image.getAttribute('href');
    if(href&&!href.startsWith('data:')&&!href.startsWith('#'))image.setAttribute('href',new URL(href,url).href);
  }
  const viewBox=svg.getAttribute('viewBox');
  const nodes=$$('*',svg).flatMap(node=>mobileAttributes.filter(a=>node.hasAttribute(`data-mobile-${a}`)).map(attr=>({
    node,attr,desktop:node.getAttribute(attr),mobile:node.getAttribute(`data-mobile-${attr}`)
  })));
  host.replaceChildren(svg);
  let lastLayout=null;
  const layout=()=>{
    const mobile=host.clientWidth<600;
    if(mobile===lastLayout)return;
    lastLayout=mobile;
    svg.setAttribute('viewBox',mobile?svg.dataset.mobileViewbox:viewBox);
    for(const item of nodes){
      const value=mobile?item.mobile:item.desktop;
      if(value===null)item.node.removeAttribute(item.attr);else item.node.setAttribute(item.attr,value);
    }
    host.dataset.layout=mobile?'mobile':'desktop';
    host.dispatchEvent(new Event('diagramlayout'));
  };
  const observer=new ResizeObserver(layout);observer.observe(host);layout();
  return svg;
}

function controls(kind,speed){
  const stepButtons=detailSteps[kind].map((s,i)=>`<button type="button" data-detail-step="${i}" aria-pressed="false"><span>0${i+1}</span>${e(text(s.label))}</button>`).join('');
  return `<div class="detail-step-tabs" aria-label="${tr('Mechanism stages','机制步骤')}">${stepButtons}</div>
    <div class="detail-transport"><button type="button" class="detail-play" data-detail-play>${tr('Pause','暂停')}</button>
    <button type="button" data-detail-prev aria-label="${tr('Previous mechanism stage','上一个机制步骤')}">&larr;</button>
    <button type="button" data-detail-next aria-label="${tr('Next mechanism stage','下一个机制步骤')}">&rarr;</button>
    <button type="button" data-detail-reset>${tr('Restart','重播')}</button>
    <input data-detail-seek type="range" min="0" max="${detailSteps[kind].length*100}" step="1" value="0" aria-label="${tr('Mechanism animation progress','机制动画进度')}">
    <span class="detail-position" data-detail-position>01 / 04</span>
    <label class="detail-speed"><span>${tr('Speed','速度')}</span><select data-detail-speed aria-label="${tr('Illustration playback speed','示意动画播放速度')}">${[.5,1,1.5].map(value=>`<option value="${value}"${value===speed?' selected':''}>${value}&times;</option>`).join('')}</select></label></div>
`;
}

function initLab(root){
  const kind=root.dataset.lab,host=$('[data-scene]',root),toolbar=$('[data-detail-controls]',root);
  const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
  let svg=null,position=0,wantsPlay=!reduced(),inView=false,raf=0,last=null,role='reference',mode='encoder';
  let clockSVG=null,completed=0,clockFailed=false,staticKey='',speed=1,replayStage=null,packets=[];
  let sampling=null,previewBranch='semantic';
  const visual=host.closest('.detail-visual'),guide=document.createElement('div');
  guide.className='detail-live-guide';guide.hidden=true;host.before(guide);
  visual.tabIndex=0;visual.setAttribute('role','region');
  const running=()=>!!svg&&wantsPlay&&inView&&root.open&&!document.hidden&&mode==='encoder';
  const stopFrame=()=>{cancelAnimationFrame(raf);raf=0;last=null;};
  const drawClock=()=>{
    const s=detailClockState(completed);
    if(clockSVG)$$('[data-transition]',clockSVG).forEach(node=>{
      const done=+node.dataset.transition<=s.completed;
      node.dataset.completed=String(done);$('circle',node).setAttribute('fill',done?'#D86689':'#FBE8EF');
    });
    const output=$('[data-clock-output]',root);
    if(output)output.textContent=tr(`${s.completed} completed transition${s.completed===1?'':'s'} / ${s.executionWrites} progress write${s.executionWrites===1?'':'s'}`,`${s.completed} 次已完成转移 / ${s.executionWrites} 次进度写入`);
    const note=$('[data-clock-note]',root);
    if(note)note.textContent=clockFailed?tr('Interactive clock illustration is unavailable; the protocol below remains readable.','交互时钟图暂不可用，下方协议说明仍可阅读。'):completed?tr('Reference remains fixed. Denoising still performs zero writes.','参考记忆保持固定，去噪期间仍为零次写入。'):tr('At t = 0, execution memory is initialized. Its dynamic-delta read is zero.','t = 0 时执行记忆处于初始化状态，dynamic-delta 读取为零。');
    const slider=$('[data-clock-seek]',root);if(slider)slider.value=String(completed);
    const next=$('[data-clock-next]',root);if(next)next.disabled=completed===8;
  };
  function draw(){
    if(!svg)return;
    const v=detailFrame(kind,position,role),s=v.step,motion=detailPresentation(kind,position,role);
    const samples=kind==='encoding'?encodingSampleFrame(position):null;
    const flow=samples?encodingFlowFrame(position):null;
    const key=[v.index,motion.phase,motion.packetLabel,v.writeActive,v.referenceWrites,v.executionWrites,role,host.dataset.layout,document.documentElement.lang,wantsPlay,running(),replayStage,samples?.semantic.index,samples?.motion.index,previewBranch].join(':');
    if(key!==staticKey){
      staticKey=key;
      root.dataset.stage=String(v.index);root.dataset.playing=String(running());
      root.dataset.replaying=String(replayStage!==null);
      guide.dataset.tone=kind==='cross'&&v.index<2?role:kind==='block'&&v.index===1?'reference':kind==='block'&&v.index===2?'progress':'action';
      $('[data-detail-guide]',guide).textContent=text(motion.guide);
      $('[data-detail-mini-play]',guide).textContent=wantsPlay?tr('Pause','暂停'):tr('Play','播放');
      $('[data-detail-mini-play]',guide).setAttribute('aria-pressed',String(wantsPlay));
      $('[data-detail-replay]',guide).textContent=replayStage!==null?tr('Replaying step','正在重播本步'):tr('Replay step','重播本步');
      $('[data-detail-replay]',guide).setAttribute('aria-pressed',String(replayStage!==null));
      visual.setAttribute('aria-label',tr(`${kind} mechanism player; click a block or use the controls`,`${kind} 机制播放器；点击模块或使用播放控件`));
      host.dataset.writing=String(v.writeActive);
      host.dataset.committed=String(v.referenceWrites+v.executionWrites>0);
      $$('[data-steps]',svg).forEach(node=>node.dataset.active=String(node.dataset.steps.split(',').includes(String(v.index))));
      $$('[data-detail-step]',root).forEach(button=>{
        const index=+button.dataset.detailStep;
        button.setAttribute('aria-pressed',String(index===v.index));
        button.style.setProperty('--detail-step-progress',index<v.index?1:0);
      });
      $$('[data-inspect-stage]',svg).forEach(node=>{
        const index=+node.dataset.inspectStage;
        node.setAttribute('aria-label',`${tr('Inspect','查看')} ${text(detailSteps[kind][index].label)}`);
        node.setAttribute('aria-pressed',String(index===v.index));
      });
      $('[data-step-title]',root).textContent=text(s.title);
      $('[data-step-description]',root).textContent=text(s.body);
      $('[data-step-formula]',root).textContent=s.formula;
      $('[data-step-kicker]',root).textContent=tr(`STEP 0${v.index+1} / 04`,`步骤 0${v.index+1} / 04`);
      $('[data-detail-position]',root).textContent=`0${v.index+1} / 04`;
      $('[data-detail-play]',root).textContent=wantsPlay?tr('Pause','暂停'):tr('Play','播放');
      $('[data-detail-play]',root).setAttribute('aria-pressed',String(wantsPlay));
      $('[data-detail-prev]',root).disabled=v.index===0;
      $('[data-detail-next]',root).disabled=v.index===3;
      if(kind==='cross'){
        host.style.setProperty('--detail-memory',role==='reference'?'#BCA5C3':'#D86689');
        host.style.setProperty('--detail-memory-light',role==='reference'?'#F0E8F2':'#FBE8EF');
        $('[data-state-label]',svg).textContent=role==='reference'?tr('independent reference state','独立的参考状态'):tr('independent progress state','独立的进度状态');
        $('[data-context-label]',svg).textContent=role==='reference'?tr('Reference registers','参考 registers'):tr('Completed transition','已完成的转移');
        const image=$('[data-context-image]',svg),imageURL=new URL(`assets/method/${role==='reference'?'human-2':'observation-4'}.jpg`,document.baseURI).href;
        if(image.getAttribute('href')!==imageURL)image.setAttribute('href',imageURL);
        $('[data-writer-input]',root).textContent=role==='reference'?tr('Fused reference registers U_R','融合后的参考 registers U_R'):tr('New observation + state + preceding executed action U_E','新观测 + 状态 + 前一步实际执行动作 U_E');
        $('[data-writer-schedule]',root).textContent=role==='reference'?tr('Preload, then keep the terminal state fixed.','预加载后固定参考终态。'):tr('One write after each completed transition.','每次控制转移完成后写入一次。');
        $('[data-write-status]',root).textContent=v.writeActive?tr('Updating the fast MLP','正在更新 fast MLP'):v.referenceWrites+v.executionWrites?tr('Stored. Queries do not write.','已写入，后续查询只读。'):tr('Context ready for encoding','上下文就绪，等待编码');
        $$('[data-writer-role]',root).forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.writerRole===role)));
      }
      packets.forEach(packet=>{
        const alt=packet.node.dataset.packet==='motion';
        if(packet.label)packet.label.textContent=motion.packetLabel;
        const color=kind==='cross'&&v.index<2?(role==='reference'?'#BCA5C3':'#D86689'):kind==='block'&&v.index===1?'#BCA5C3':kind==='block'&&v.index===2?'#D86689':alt||kind==='encoding'&&v.index===3?'#BCA5C3':'#FFD968';
        packet.rect.setAttribute('fill',color);
        packet.route=samples&&v.index===0?sampling[packet.node.dataset.packet].routes[samples[packet.node.dataset.packet].index]:$(`[data-route${alt?'-alt':''}="${v.index}"]`,svg);
        packet.length=packet.route?.getTotalLength()||0;
        if(packet.encodingCrop){
          const branch=packet.node.dataset.packet,image=sampling[branch].images[samples[branch].index];
          $('use',packet.encodingCrop).setAttribute('href',`#${image.id}`);
          packet.encodingCrop.setAttribute('viewBox',['x','y','width','height'].map(attr=>image.getAttribute(attr)||0).join(' '));
          packet.encodingToken.textContent=v.index===2?(branch==='semantic'?'A_S':'A_M'):v.index===3?'U_R':'';
          packet.encodingToken.style.fontSize='9px';
        }
      });
      if(samples){
        for(const branch of ['semantic','motion']){
          const sample=samples[branch];
          sampling[branch].nodes.forEach((node,i)=>{
            node.dataset.sampleActive=String(sample.active&&i===sample.index);
            node.dataset.sampleSeen=String(!sample.active||i<=sample.index);
            node.setAttribute('aria-pressed',String(sample.active&&i===sample.index));
            node.setAttribute('aria-label',tr(`Inspect ${branch} source frame ${encodingSamples[branch][i]}`,`查看${branch==='semantic'?'语义':'动作'}源帧 ${encodingSamples[branch][i]}`));
          });
          sampling[branch].stream.setAttribute('opacity',v.index===1?'1':'0');
          sampling[branch].route=$(`[data-route${branch==='motion'?'-alt':''}="1"]`,svg);
          sampling[branch].length=sampling[branch].route.getTotalLength();
        }
        const preview=sampling[previewBranch].images[samples[previewBranch].index];
        sampling.preview.setAttribute('href',preview.getAttribute('href'));
        sampling.caption.textContent=tr(`Source frame ${samples[previewBranch].frame} / 212`,`源帧 ${samples[previewBranch].frame} / 212`);
        sampling.dots.forEach((dot,i)=>dot.setAttribute('r',v.index===0&&i===samples.semantic.index?'7':'4'));
        sampling.dense.setAttribute('stroke-width',v.index===0?'3':'2');
      }
    }
    $('[data-detail-seek]',root).value=String(Math.round(position*100));
    $(`[data-detail-step="${v.index}"]`,root).style.setProperty('--detail-step-progress',v.fraction);
    packets.forEach(packet=>{
      if(!packet.route)return;
      const sample=samples?.[packet.node.dataset.packet];
      const p=packet.route.getPointAtLength(packet.length*(sample?.active?sample.travel:flow?flow.packetTravel:motion.packetProgress));
      packet.node.setAttribute('transform',`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
      if(packet.crop){
        const size=motion.cropSize;
        for(const node of [packet.rect,packet.crop]){
          node.setAttribute('x',-size/2);node.setAttribute('y',-size/2);
          node.setAttribute('width',size);node.setAttribute('height',size);
        }
        packet.crop.setAttribute('opacity',motion.cropOpacity);
        if(packet.label)packet.label.setAttribute('opacity',1-motion.cropOpacity);
      }
      if(packet.encodingCrop){
        const width=sample.active?sample.size:32,height=sample.active?sample.size:22;
        for(const node of [packet.rect,packet.encodingCrop]){
          node.setAttribute('x',-width/2);node.setAttribute('y',-height/2);
          node.setAttribute('width',width);node.setAttribute('height',height);
        }
        packet.encodingCrop.setAttribute('opacity',sample.cropOpacity);
        packet.encodingToken.setAttribute('opacity',sample.active?'0':'1');
        packet.node.setAttribute('opacity',sample.active?sample.packetOpacity:v.index===3&&packet.node.dataset.packet==='motion'?0:flow.packetOpacity);
      }
    });
    if(kind==='block'){
      const pulse=$('[data-read-pulse]',svg),route=$(`[data-read-route="${v.index}"]`,svg);
      pulse.setAttribute('opacity',motion.readPulse?'1':'0');
      if(motion.readPulse&&route){
        const p=route.getPointAtLength(route.getTotalLength()*motion.readProgress);
        pulse.setAttribute('transform',`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
        $('rect',pulse).setAttribute('fill',v.index===1?'#BCA5C3':'#D86689');
        $('text',pulse).textContent=v.index===1?'ΔR':'ΔE';
      }
    }
    if(kind==='cross')$$('[data-weight-grid] rect',svg).forEach((cell,i)=>cell.setAttribute('opacity',motion.weightPattern[i].toFixed(4)));
    if(flow){
      for(const branch of ['semantic','motion']){
        const lane=sampling[branch];
        lane.tokens.forEach((token,i)=>{
          const state=flow.tokens[i],point=lane.route.getPointAtLength(lane.length*state.travel);
          token.setAttribute('transform',`translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
          token.setAttribute('opacity',state.opacity);
        });
        lane.registers.forEach((cell,i)=>cell.setAttribute('fill-opacity',.12+.88*flow.registers[i]));
        lane.intake.setAttribute('fill-opacity',samples[branch].active ? .35+.65*samples[branch].travel : .35);
      }
      sampling.fused.forEach((cell,i)=>cell.setAttribute('fill-opacity',.12+.88*flow.fused[i]));
      sampling.fusion.dataset.fusing=String(flow.fusing);
    }
  }
  function tick(now){
    raf=0;if(!running()){last=null;draw();return;}
    if(last!==null){
      const next=advanceDetail(position,now-last,speed,replayStage);position=next.position;
      if(next.finished){wantsPlay=false;replayStage=null;last=null;draw();return;}
    }
    last=now;draw();raf=requestAnimationFrame(tick);
  }
  function sync(){if(running()){if(!raf)raf=requestAnimationFrame(tick);}else stopFrame();draw();}
  function seek(value){position=Math.max(0,Math.min(4,value));wantsPlay=false;replayStage=null;sync();}
  function togglePlay(){wantsPlay=!wantsPlay;if(position===4)position=0;sync();}
  function replay(){replayStage=detailFrame(kind,position).index;position=replayStage;wantsPlay=true;last=null;sync();}
  function step(direction){seek(Math.max(0,Math.min(3,detailFrame(kind,position).index+direction))+.92);}
  function bindControls(){
    staticKey='';
    guide.innerHTML=`<div class="detail-now"><span>${tr('NOW','此刻')}</span><p data-detail-guide></p></div><div class="detail-guide-actions"><button type="button" data-detail-mini-play>${tr('Pause','暂停')}</button><button type="button" data-detail-replay title="${tr('Replay this stage once, then pause','仅重播当前步骤一次，然后暂停')}">${tr('Replay step','重播本步')}</button></div>`;
    guide.hidden=false;
    toolbar.innerHTML=controls(kind,speed);toolbar.hidden=false;
    $('[data-detail-play]',root).onclick=togglePlay;
    $('[data-detail-mini-play]',guide).onclick=togglePlay;
    $('[data-detail-replay]',guide).onclick=replay;
    $('[data-detail-prev]',root).onclick=()=>step(-1);
    $('[data-detail-next]',root).onclick=()=>step(1);
    $('[data-detail-reset]',root).onclick=()=>{position=0;replayStage=null;sync();};
    $('[data-detail-seek]',root).oninput=ev=>seek(+ev.target.value/100);
    $('[data-detail-speed]',root).onchange=ev=>{speed=+ev.target.value;last=null;sync();};
    $$('[data-detail-step]',root).forEach(button=>button.onclick=()=>seek(+button.dataset.detailStep+.92));
  }
  async function start(){
    try{
      svg=await loadDiagram(host);
      packets=$$('[data-packet]',svg).map(node=>({node,rect:$('rect',node),label:$('[data-packet-label]',node),crop:$('[data-detail-crop]',node),encodingCrop:$('[data-encoding-crop]',node),encodingToken:$('[data-encoding-token]',node)}));
      if(kind==='encoding'){
        sampling={preview:$('[data-source-preview]',svg),caption:$('[data-source-caption]',svg),dots:$$('[data-sample-dot]',svg),dense:$('[data-dense-window]',svg),fused:$$('[data-register-bank="fused"] rect',svg),fusion:$('[data-fusion]',svg)};
        for(const branch of ['semantic','motion']){
          const nodes=$$(`[data-sample-frame="${branch}"]`,svg);
          const stream=$(`[data-token-stream="${branch}"]`,svg);
          sampling[branch]={nodes,images:nodes.map(node=>node.tagName==='image'?node:$('image',node)),routes:encodingSamples[branch].map((_,i)=>$(`[data-sample-route="${branch}-${i}"]`,svg)),stream,tokens:$$(':scope > g',stream),registers:$$(`[data-register-bank="${branch}"] rect`,svg),intake:$(`[data-encoder-intake="${branch}"]`,svg)};
          nodes.forEach((node,i)=>{
            const inspect=()=>{previewBranch=branch;seek(encodingSamplePosition(branch,i));};
            node.setAttribute('role','button');node.setAttribute('tabindex','0');
            node.onclick=inspect;
            node.onkeydown=event=>{
              if(event.key!=='Enter'&&event.key!==' ')return;
              event.preventDefault();event.stopPropagation();inspect();
            };
          });
        }
      }
      svg.setAttribute('role','group');
      $$('[data-inspect-stage]',svg).forEach(node=>{
        node.setAttribute('role','button');node.setAttribute('tabindex','0');
        node.onclick=()=>seek(+node.dataset.inspectStage+.92);
        node.onkeydown=event=>{
          if(event.key!=='Enter'&&event.key!==' ')return;
          event.preventDefault();event.stopPropagation();seek(+node.dataset.inspectStage+.92);
        };
      });
      bindControls();root.dataset.ready='true';draw();sync();
      const retry=$('[data-detail-error]',root);if(retry)retry.hidden=true;
    }catch{
      root.dataset.ready='false';
      const error=$('[data-detail-error]',root);error.hidden=false;
      error.innerHTML=`${tr('The interactive SVG could not load. The explanation remains available.','交互 SVG 加载失败，文字说明仍可阅读。')} <button type="button">${tr('Retry','重试')}</button>`;
      $('button',error).onclick=start;
    }
  }
  host.addEventListener('diagramlayout',()=>{if(svg)draw();});
  const io=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();},{threshold:.08});io.observe(host);
  root.addEventListener('toggle',sync);
  document.addEventListener('visibilitychange',sync);
  motionQuery.addEventListener('change',()=>{if(motionQuery.matches)wantsPlay=false;sync();});
  document.addEventListener('languagechange',()=>{if(svg){bindControls();draw();}drawClock();});
  visual.addEventListener('keydown',event=>{
    if(event.target.closest('button,input,select,a,summary,[role="button"]'))return;
    if(![' ','ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();
    if(event.key===' ')togglePlay();else step(event.key==='ArrowLeft'?-1:1);
  });
  $$('[data-writer-role]',root).forEach(button=>button.onclick=()=>{role=button.dataset.writerRole;position=0;replayStage=null;sync();});
  const viewButtons=$$('[data-detail-view]',root);
  function setView(value){
    mode=value;
    $$('[data-detail-panel]',root).forEach(panel=>panel.hidden=panel.dataset.detailPanel!==value);
    viewButtons.forEach(button=>{button.setAttribute('aria-selected',String(button.dataset.detailView===value));button.tabIndex=button.dataset.detailView===value?0:-1;});
    sync();drawClock();
  }
  viewButtons.forEach((button,index)=>{
    button.onclick=()=>setView(button.dataset.detailView);
    button.onkeydown=ev=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(ev.key))return;
      ev.preventDefault();
      const target=ev.key==='Home'?0:ev.key==='End'?viewButtons.length-1:(index+(ev.key==='ArrowRight'?1:-1)+viewButtons.length)%viewButtons.length;
      setView(viewButtons[target].dataset.detailView);viewButtons[target].focus();
    };
  });
  const clockHost=$('[data-clock-scene]',root);
  if(clockHost){
    loadDiagram(clockHost).then(scene=>{clockSVG=scene;drawClock();}).catch(()=>{
      clockFailed=true;drawClock();
    });
    $('[data-clock-seek]',root).oninput=ev=>{completed=+ev.target.value;drawClock();};
    $('[data-clock-next]',root).onclick=()=>{completed=Math.min(8,completed+1);drawClock();};
    $('[data-clock-reset]',root).onclick=()=>{completed=0;drawClock();};
  }
  start();
}

export function initMethodDetails(){
  $$('.method-closeups [data-lab]').forEach(initLab);
}
