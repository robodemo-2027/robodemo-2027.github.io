import {$,tr,reduced} from './lib.js';
import {timeline} from './method-state.js';
import {methodSVG,bindMethodMotion} from './method-svg.js';
import {METHOD_SECONDS} from './method-motion.js';
import {playbackPosition,animationTime,seekPosition,METHOD_SEEK_STEP} from './method-navigation.js';
import {methodCue} from './method-guide.js';
export function initMethod(){
  let index=0,playing=false,elapsed=0,last=0,speed=1,source='human',paint,userPaused=false,resumeOnVisible=false,inView=false,loops=0,raf=0,replayingStep=false;
  const host=$('#method-canvas'),range=$('#method-scrub'),play=$('#method-play');
  const player=$('.method-player'),mount=$('#method-inline'),dialog=$('#method-focus-dialog'),focus=$('#method-focus');
  const toggle=$('#method-overlay-play'),chapters=[...document.querySelectorAll('[data-method-jump]')];
  const guide=$('#method-live-guide'),guideText=$('#method-guide-text'),replay=$('#method-replay-step');
  let returnFocus=null,lastCue='';
  range.max=timeline.length;range.step=METHOD_SEEK_STEP;
  function controls(){
    player.dataset.playing=String(playing);
    host.dataset.playing=String(playing);
    $('#method-stage').dataset.playing=String(playing);
    play.textContent=playing?tr('Pause','暂停'):tr('Play','播放');
    toggle.setAttribute('aria-label',playing?tr('Pause method animation','暂停方法动画'):tr('Play method animation','播放方法动画'));
    $('#method-motion-status').textContent=playing?
      (replayingStep?tr('Replaying this step','正在重播本步'):$('#method-loop').checked?tr('Looping illustration','循环动画播放中'):tr('Playing illustration','动画播放中')):
      tr('Paused · click to play','已暂停 · 点击播放');
    replay.dataset.active=String(replayingStep);
    replay.title=tr('Replay just this step, then pause. It does not change the full-loop setting.','仅重播当前步骤并停在末尾，不改变完整循环设置。');
    $('#method-focus-label').textContent=dialog.open?tr('Close focus view','退出专注视图'):tr('Focus view','专注视图');
    focus.setAttribute('aria-expanded',String(dialog.open));
    dialog.setAttribute('aria-label',tr('Method animation focus view','方法动画专注视图'));
    player.setAttribute('aria-label',tr('Interactive method animation','可交互方法动画'));
    $('#method-time').title=tr('Illustration time, not robot control time','动画播放时间，不是机器人控制时间');
    range.title=tr('Drag to inspect any moment. Arrow keys on this slider move in small increments.','拖动以检查任意时刻；聚焦此滑块后，方向键可细调。');
  }
  function framePaint(fraction){
    const v=paint(index,fraction),s=v.state;
    $('#method-clock').textContent=`${index<8?'PRE-ROLLOUT':v.phase==='denoise'?'ACTION DENOISING':'CONTROL STEP '+s.controlStep} · R=${s.referenceVersion} · E=${s.executionVersion}`;
    const position=playbackPosition(index,fraction);
    $('#method-time').textContent=`${animationTime(position.seconds)} / ${animationTime(position.duration)}`;
    range.value=(index+fraction).toFixed(2);
    const t=timeline[index],percent=Math.round(fraction*100);
    range.setAttribute('aria-valuetext',tr(`Step ${index+1} of ${timeline.length}, ${percent}%: ${t.title}`,`第 ${index+1}/${timeline.length} 步，${percent}%：${t.cn}`));
    const cue=methodCue(v),text=tr(cue.en,cue.zh);
    if(lastCue!==text){
      guideText.textContent=text;guide.dataset.side=cue.side;guide.dataset.cue=cue.key;lastCue=text;
    }
    position.chapters.forEach((chapter,i)=>{
      chapters[i].style.setProperty('--chapter-progress',chapter.progress.toFixed(4));
      chapters[i].dataset.state=chapter.active?'current':chapter.complete?'complete':'upcoming';
    });
  }
  function draw(){
    const t=timeline[index],mobile=matchMedia('(max-width: 900px)').matches,fraction=elapsed/METHOD_SECONDS;
    host.innerHTML=methodSVG(index,{mobile,source,fraction});
    paint=bindMethodMotion(host,{mobile,source});
    $('#method-title').textContent=source==='human'&&t.phase==='retrieve'?tr('Use a human reference directly','直接使用人类参考，无需检索'):tr(t.title,t.cn);
    $('#method-detail').textContent=tr(t.detail,t.detailCN);
    $('#method-count').textContent=`${String(index+1).padStart(2,'0')} / ${timeline.length}`;
    framePaint(fraction);
    playbackPosition(index,fraction).chapters.forEach((chapter,i)=>{
      chapters[i].setAttribute('aria-pressed',String(chapter.active));
      if(chapter.active)chapters[i].setAttribute('aria-current','step');
      else chapters[i].removeAttribute('aria-current');
    });
  }
  function stop(manual=false){
    cancelAnimationFrame(raf);raf=0;
    playing=false;if(manual){userPaused=true;resumeOnVisible=false;}
    controls();
  }
  function start(manual=true){
    if(manual)userPaused=false;
    resumeOnVisible=true;
    if(playing)return;
    // Human input bypasses retrieval; reveal image-to-token motion on first entry.
    if(!manual&&source==='human'&&index===0&&elapsed===0)index=2;
    if(index===timeline.length-1&&elapsed>=METHOD_SECONDS)index=0;
    if(elapsed>=METHOD_SECONDS)elapsed=0;
    playing=true;last=performance.now();controls();draw();
    raf=requestAnimationFrame(frame);
  }
  const set=i=>{replayingStep=false;stop(true);index=Math.max(0,Math.min(timeline.length-1,i));elapsed=METHOD_SECONDS;draw();};
  function seek(value){
    replayingStep=false;stop(true);
    const next=seekPosition(value),changed=next.index!==index;
    index=next.index;elapsed=next.fraction*METHOD_SECONDS;
    // Keep the same SVG nodes while inspecting different moments within one step.
    if(changed)draw();else framePaint(next.fraction);
  }
  play.onclick=()=>{if(playing)stop(true);else start();};
  toggle.onclick=()=>{if(playing)stop(true);else start();};
  $('#method-prev').onclick=()=>set(index-1);
  $('#method-next').onclick=()=>set(index+1);
  $('#method-restart').onclick=()=>{set(0);elapsed=0;draw();};
  range.oninput=()=>seek(range.value);
  replay.onclick=()=>{stop(true);elapsed=0;replayingStep=true;start();};
  $('#method-speed').onchange=e=>{speed=+e.target.value;};
  $('#method-loop').onchange=controls;
  $('#method-source').onchange=e=>{source=e.target.value;set(0);elapsed=0;draw();};
  chapters.forEach(b=>b.onclick=()=>{set(+b.dataset.methodJump);elapsed=0;start();});
  function closeFocus(){dialog.close();}
  function openFocus(){
    returnFocus=document.activeElement;
    // Move the one live player, never clone a second animation or reset its state.
    mount.style.minHeight=`${player.getBoundingClientRect().height}px`;
    dialog.append(player);dialog.showModal();
    document.documentElement.classList.add('method-focus-open');
    controls();focus.focus({preventScroll:true});
  }
  focus.onclick=()=>dialog.open?closeFocus():openFocus();
  dialog.addEventListener('close',()=>{
    mount.append(player);mount.style.minHeight='';
    document.documentElement.classList.remove('method-focus-open');
    controls();returnFocus?.focus({preventScroll:true});
  });
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const items=[...dialog.querySelectorAll('[tabindex="0"],button,input,select,a[href]')]
      .filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);
    const first=items[0],last=items.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  player.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||event.target.closest('button,input,select,textarea,a,summary'))return;
    if(event.key===' '||event.key.toLowerCase()==='k'){
      event.preventDefault();playing?stop(true):start();
    }else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();set(index+(event.key==='ArrowRight'?1:-1));
    }else if(event.key.toLowerCase()==='f'){
      event.preventDefault();dialog.open?closeFocus():openFocus();
    }
  });
  function frame(now){
    raf=0;
    const dt=Math.min((now-last)/1000,.1);last=now;
    if(playing){
      elapsed=Math.min(METHOD_SECONDS,elapsed+dt*speed);
      // Explicit Play opts into motion, even if automatic motion is disabled.
      framePaint(elapsed/METHOD_SECONDS);
      if(elapsed>=METHOD_SECONDS){
        if(replayingStep){replayingStep=false;stop(true);return;}
        if(index===timeline.length-1){
          if($('#method-loop').checked){index=0;elapsed=0;host.dataset.loopCount=String(++loops);draw();}
          else stop(true);
        }else{index++;elapsed=0;draw();}
      }
    }
    // Paused and offscreen players schedule no idle animation callbacks.
    if(playing)raf=requestAnimationFrame(frame);
  }
  draw();stop();
  const io=new IntersectionObserver(es=>{
    inView=es[0].isIntersecting||dialog.open;
    if(!inView)stop();
    else if(!document.hidden&&!userPaused&&(resumeOnVisible||(!reduced()&&!navigator.connection?.saveData)))start(false);
  },{threshold:.08});io.observe(host);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)stop();
    else if(inView&&!userPaused&&resumeOnVisible)start(false);
  });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{stop();resumeOnVisible=false;elapsed=METHOD_SECONDS;draw();});
  matchMedia('(max-width: 900px)').addEventListener('change',draw);
  document.addEventListener('languagechange',()=>{draw();controls();});
  return{set,stop};
}
