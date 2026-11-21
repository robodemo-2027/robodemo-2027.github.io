import {$,$$,tr,escapeHTML as e,clamp,guardVisible,expand} from './lib.js';
import {MediaSession} from './media-session.js';
import {successfulHumanCases} from './successful-demos.js?v=20261121-six';
export function initDemos(data){
  const tasks=successfulHumanCases(data);
  if(!tasks.length)throw new Error('No verified successful human-guided recordings.');
  const params=new URLSearchParams(location.search);
  let key=tasks.some(t=>t.key===params.get('task'))?params.get('task'):tasks[0].key;
  if(params.has('comparison')&&params.get('comparison')!=='paired'){
    params.set('comparison','paired');
    history.replaceState(null,'',`${location.pathname}?${params}${location.hash}`);
  }
  let step=0,speed=1,active=false,master=null,descriptors=[],lastFrame=0;
  const session=new MediaSession(),task=()=>tasks.find(t=>t.key===key),host=$('#demo-videos');
  function status(msg){$('#demo-status').textContent=msg;}
  function pause(){session.pause();$('#demo-play').textContent=tr('Play together','联合播放');}
  function setRate(){
    session.elements.forEach((v,i)=>{const d=descriptors[i];v.playbackRate=speed*(d.human&&$('#demo-align').checked?d.duration/25:1);});
  }
  function seek(n){
    pause();step=clamp(Math.round(n),0,500);
    session.elements.forEach((v,i)=>{
      const d=descriptors[i],time=d.human?($('#demo-align').checked?step/500*d.duration:step/20):step/20;
      if(Number.isFinite(v.duration))v.currentTime=Math.min(time,Math.max(0,v.duration-.001));
    });readout();
  }
  function readout(){$('#demo-step').textContent=`STEP ${String(step).padStart(3,'0')} / 500`;$('#demo-scrub').value=step;host.dataset.step=String(step);}
  function render(){
    pause();step=0;
    const t=task();
    descriptors=[
      {label:tr('Human demonstration','人类演示输入'),tag:tr('HUMAN INPUT','人类输入'),human:true,duration:t.humanDuration,src:t.videos.human,poster:t.posters.human,id:t.reference},
      {label:tr('Human-guided robot execution','使用人类演示的机器人执行'),tag:tr('L0 · FINAL SUCCESS','L0 · 终态成功'),src:t.videos.with,poster:t.posters.with,id:t.trial,success:true}
    ];
    const videos=descriptors.map(d=>{let v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='none';v.poster=d.poster;v.dataset.identity=d.id;v.setAttribute('aria-label',d.label);if(active){v.src=d.src;v.preload='metadata';}v.addEventListener('error',()=>{if(session.elements.includes(v)){pause();status(tr('A recording could not load. Press Retry. No alternative or synthetic outcome is substituted.','录像加载失败，请重试。不会替换为其他录像或合成结果。'));}});return v;});
    session.replace(videos);host.replaceChildren();
    descriptors.forEach((d,i)=>{let div=document.createElement('figure');div.className='video-panel';if(!d.human)div.dataset.outcome='success';div.innerHTML=`<figcaption class="panel-label"><span>${e(d.label)}</span><span class="badge ${d.human?'':'success'}">${e(d.tag)}</span></figcaption>`;div.append(videos[i]);host.append(div);});
    master=videos[1];
    videos.forEach(v=>{
      v.addEventListener('waiting',()=>{if(session.elements.includes(v)&&session.wantsPlay)status(tr('Buffering recorded video. Please wait, or use Retry on a slow connection.','正在缓冲录像，请稍候；网络较慢时可点击重试。'));});
      v.addEventListener('playing',()=>{if(session.elements.includes(v))status(tr('Playing verified recordings.','正在播放核验后的录像。'));});
      v.addEventListener('loadedmetadata',()=>{if(session.elements.includes(v)){setRate();if(!session.wantsPlay){const i=session.elements.indexOf(v),d=descriptors[i];v.currentTime=Math.min(d.human?($('#demo-align').checked?step/500*d.duration:step/20):step/20,v.duration-.001);}}});
    });
    $('#demo-title').textContent=tr(t.en,t.zh);
    $('#demo-instruction').textContent=tr('Recorded target instruction: ','原始目标指令：')+t.language;
    const stages=tr(t.stages[0],t.stages[1]);$('#demo-stages').innerHTML=stages.filter((_,i)=>i<4).map(s=>`<span>${e(s)}</span>`).join('')+`<em>${tr('manual stage descriptions, not measured timestamps','人工阶段描述，非测得时间边界')}</em>`;
    $('#demo-tabs').innerHTML=tasks.map(x=>`<button role="tab" aria-selected="${x.key===key}" data-key="${x.key}" tabindex="${x.key===key?0:-1}"><img src="${x.posters.with}" alt="" loading="lazy"><span>${e(tr(x.short[0],x.short[1]))}</span></button>`).join('');
    $$('[data-key]',$('#demo-tabs')).forEach(b=>b.onclick=()=>{key=b.dataset.key;render();updateURL();});
    $('#demo-first').textContent=`${tr('First success','首次成功')} · ${Math.round(t.firstSuccess*20)}`;
    status('');setRate();readout();
  }
  function updateURL(){const p=new URLSearchParams(location.search);p.set('task',key);p.set('comparison','paired');history.replaceState(null,'',`${location.pathname}?${p}#human-demos`);}
  $('#demo-play').onclick=()=>{if(session.wantsPlay)pause();else{if(step>=500)seek(0);setRate();session.play(status);$('#demo-play').textContent=tr('Pause together','联合暂停');}};
  $('#demo-replay').onclick=()=>seek(0);
  $('#demo-prev').onclick=()=>seek(step-1);
  $('#demo-next').onclick=()=>seek(step+1);
  $('#demo-first').onclick=()=>seek(task().firstSuccess*20);
  $('#demo-final').onclick=()=>seek(500);
  $('#demo-scrub').oninput=ev=>seek(+ev.target.value);
  $('#demo-speed').onchange=ev=>{speed=+ev.target.value;setRate();};
  $('#demo-align').onchange=()=>{setRate();seek(step);};
  $('#demo-expand').onclick=()=>{expand($('#demo-lab'));$('#demo-expand').textContent=$('#demo-lab').classList.contains('expanded')?tr('Close expanded view','关闭大图'):tr('Expand','放大');};
  $('#demo-retry').onclick=()=>{render();};
  $('#demo-tabs').onkeydown=ev=>{
    if(['ArrowRight','ArrowLeft','Home','End'].includes(ev.key)){ev.preventDefault();let i=tasks.findIndex(t=>t.key===key);i=ev.key==='Home'?0:ev.key==='End'?tasks.length-1:(i+(ev.key==='ArrowLeft'?-1:1)+tasks.length)%tasks.length;key=tasks[i].key;render();$(`[data-key="${key}"]`,$('#demo-tabs')).focus();updateURL();}
  };
  function frame(now){
    if(session.wantsPlay&&master&&master.readyState>=2&&now-lastFrame>40){
      lastFrame=now;step=Math.min(500,Math.round(master.currentTime*20));readout();
      session.elements.forEach((v,i)=>{
        if(v===master||v.readyState<2)return;const d=descriptors[i],target=d.human?($('#demo-align').checked?master.currentTime/25*d.duration:master.currentTime):master.currentTime;
        if(Math.abs(v.currentTime-Math.min(target,v.duration-.001))>.16)v.currentTime=Math.min(target,v.duration-.001);
      });
      if(master.currentTime>=25||master.ended)seek(500);
    }requestAnimationFrame(frame);
  }
  const io=new IntersectionObserver(es=>{active=es[0].isIntersecting;if(active&&!master?.getAttribute('src'))render();if(!active)pause();},{threshold:.05});io.observe($('#demo-lab'));
  guardVisible($('#demo-lab'),pause);
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){$('#demo-lab').classList.remove('expanded');$('#demo-expand').textContent=tr('Expand','放大');pause();}if(ev.key===' '&&active&&!['BUTTON','INPUT','SELECT','SUMMARY'].includes(document.activeElement.tagName)){ev.preventDefault();$('#demo-play').click();}});
  document.addEventListener('languagechange',render);render();requestAnimationFrame(frame);
  return{seek,pause};
}
