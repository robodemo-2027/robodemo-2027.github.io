import {$,$$,tr,escapeHTML as e,guardVisible} from './lib.js';
import {MediaSession} from './media-session.js';
export function initRepresentations(data){
  let view='action',projection='p20',selected=0,panel='fast',locked=false,zoom=1,hoverTimer,active=false;
  const session=new MediaSession(),host=$('#rep-plots');
  const keys=()=>view==='action'?['appearance','fast']:[view];
  const rows=()=>data.plots[panel].rows;
  const stop=()=>{clearTimeout(hoverTimer);session.pause();$('#sample-play').textContent=tr('Play','播放');};
  function select(i,{play=false,fromHover=false}={}){
    selected=(i+rows().length)%rows().length;
    const r=rows()[selected],m=data.media[r.uid];
    const pair=r.pair_id?data.plots.cross.rows.find(x=>x.pair_id===r.pair_id&&x.uid!==r.uid):null;
    const chosen=[r,...(pair?[pair]:[])];
    const videos=chosen.map(x=>{
      const el=document.createElement('video');el.muted=true;el.playsInline=true;el.preload='none';el.dataset.uid=x.uid;
      if(active){el.src=data.media[x.uid].file;el.preload='metadata';}
      el.setAttribute('aria-label',`${x.uid} ${x.embodiment} dataset demonstration`);
      el.addEventListener('error',()=>{if(session.elements.includes(el))$('#sample-status').textContent=tr('Video load failed. Press Retry; the source sample has not changed.','视频加载失败，请重试；所选原始样本未改变。');});
      el.addEventListener('waiting',()=>{if(session.elements.includes(el)&&session.wantsPlay)$('#sample-status').textContent=tr('Buffering this exact source sample. Wait or Retry.','正在缓冲当前原始样本，请稍候或重试。');});
      return el;
    });
    session.replace(videos);
    const container=$('#sample-videos');container.replaceChildren();container.classList.toggle('pair',chosen.length>1);
    videos.forEach((v,i)=>{let div=document.createElement('div');let label=document.createElement('p');label.className='sample-label';label.textContent=`${chosen[i].embodiment.toUpperCase()} / DATASET DEMONSTRATION`;div.append(label,v);container.append(div);});
    $('#sample-title').textContent=tr(data.meta[r.task].name,data.meta[r.task].cn);
    $('#sample-meta').textContent=`${r.uid} · ${r.embodiment} · ${panel==='appearance'?'RGB appearance':'Fast-weight Δ (layers 1, 19, 36)'}${pair?` · Pair ${r.pair_id} / ${pair.uid}`:''}`;
    $('#sample-status').textContent=pair?tr('Manifest-defined pair. Not time-aligned; neither video is a policy rollout.','Manifest 定义配对，非时间对齐；两段均非策略执行。'):tr('The selected point’s exact human source video.','播放此点对应的准确人类源视频。');
    $('#sample-preview').classList.toggle('hovering',fromHover);
    updateSelection();
    if(play&&active){session.play(msg=>$('#sample-status').textContent=msg);$('#sample-play').textContent=tr('Pause','暂停');}
  }
  function updateSelection(){
    $$('.scatter-selected',host).forEach(x=>x.remove());
    $$('svg',host).forEach(svg=>{
      const r=rows()[selected],dots=[...svg.querySelectorAll('[data-uid]')],dot=dots.find(x=>x.dataset.uid===r.uid);
      if(!dot)return;let ring=document.createElementNS('http://www.w3.org/2000/svg','circle');
      ring.setAttribute('cx',dot.dataset.x);ring.setAttribute('cy',dot.dataset.y);ring.setAttribute('r','7');ring.classList.add('scatter-selected');svg.append(ring);
    });
  }
  function render(){
    host.classList.toggle('single',view!=='action');host.replaceChildren();
    for(const key of keys()){
      const p=data.plots[key],coords=p.views[projection].coordinates;
      const basis=key==='focus'?data.plots.cross.views[projection].coordinates:coords;
      const xs=basis.map(c=>c[0]),ys=basis.map(c=>c[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
      const scale=Math.min(352/(maxX-minX||1),272/(maxY-minY||1)),cx=(maxX+minX)/2,cy=(maxY+minY)/2;
      const points=coords.map(([x,y])=>[220+(x-cx)*scale,185-(y-cy)*scale]);
      const span=440/zoom,spanY=370/zoom;
      const label={appearance:tr('RGB appearance control · 309','RGB 外观对照 · 309'),fast:tr('RoboDemo fast weights · 309','RoboDemo fast weights · 309'),cross:tr('Five tasks × two embodiments · 100','五任务 × 两主体 · 100'),focus:tr('Pour kettle / open box · 40','倒水壶 / 开盒 · 40')}[key];
      let div=document.createElement('div');div.className='scatter-panel';div.innerHTML=`<h3>${label}</h3><svg xmlns="http://www.w3.org/2000/svg" viewBox="${220-span/2} ${185-spanY/2} ${span} ${spanY}" data-panel="${key}" role="img" aria-label="${e(label)}">${p.rows.map((r,i)=>{
        const[x,y]=points[i],c=data.meta[r.task].color,common=`data-uid="${e(r.uid)}" data-x="${x}" data-y="${y}" fill="${c}" fill-opacity=".60"`;
        return r.embodiment==='robot'?`<polygon points="${x},${y-3.8} ${x-3.6},${y+2.8} ${x+3.6},${y+2.8}" ${common}/>`:`<circle cx="${x}" cy="${y}" r="2.8" ${common}/>`;
      }).join('')}</svg>`;
      host.append(div);
      const svg=div.querySelector('svg');
      function nearest(ev){
        const rect=svg.getBoundingClientRect(),x=(ev.clientX-rect.left)/rect.width*span+(220-span/2),y=(ev.clientY-rect.top)/rect.height*spanY+(185-spanY/2);
        let best=0,dist=Infinity;points.forEach(([px,py],i)=>{let d=(x-px)**2+(y-py)**2;if(d<dist){dist=d;best=i;}});return best;
      }
      svg.addEventListener('pointermove',ev=>{
        if(locked||ev.pointerType==='touch')return;
        const i=nearest(ev);clearTimeout(hoverTimer);
        if(panel===key&&selected===i)return;
        hoverTimer=setTimeout(()=>{panel=key;select(i,{play:true,fromHover:true});},100);
      });
      svg.addEventListener('pointerleave',()=>{clearTimeout(hoverTimer);if(!locked){session.pause();$('#sample-play').textContent=tr('Play','播放');}$('#sample-preview').classList.remove('hovering');});
      svg.addEventListener('click',ev=>{clearTimeout(hoverTimer);panel=key;locked=true;select(nearest(ev),{play:true});lockLabel();});
    }
    $('#rep-legend').innerHTML=Object.values(data.meta).map(m=>`<span style="--c:${m.color}">${e(tr(m.name,m.cn))}</span>`).join('')+(view==='action'?'':`<span>○ ${tr('Human','人类')} / △ ${tr('Robot','机器人')}</span>`);
    $('#rep-claim').textContent=view==='action'?tr('Shows: task-structured representations in these 309 samples. Does not establish: pure action semantics or causal TTT gains.','说明：这 309 个样本存在任务结构。不证明：纯动作语义或 TTT 的因果收益。'):tr('Shows: task and embodiment structure in measured features. Does not establish: stable general alignment (human→robot 60%, robot→human 22%, p=0.0833).','说明：测得特征中的任务与主体结构。不证明：稳定普遍的跨主体对齐（人→机器人 60%，机器人→人 22%，p=0.0833）。');
    $('#rep-params').textContent=keys().map(k=>{const{coordinates,...params}=data.plots[k].views[projection];return`${k}: ${JSON.stringify(params)}`;}).join('\n');
    updateSelection();
  }
  function lockLabel(){$('#rep-lock').textContent=locked?tr('Unlock sample','解除锁定'):tr('Lock sample','锁定样本');$('#rep-lock').setAttribute('aria-pressed',String(locked));}
  $('#rep-view').onchange=ev=>{
    stop();view=ev.target.value;panel=view==='action'?'fast':view;selected=0;locked=false;zoom=1;
    const opts=view==='action'?['p20','pca']:['p20','p5','p10','pca'];if(!opts.includes(projection))projection='p20';
    $('#rep-projection').innerHTML=opts.map(x=>`<option value="${x}" ${x===projection?'selected':''}>${x==='pca'?'PCA':'t-SNE · '+x}</option>`).join('');render();select(0);lockLabel();
  };
  $('#rep-projection').onchange=ev=>{stop();projection=ev.target.value;render();};
  $('#rep-zoom').onclick=()=>{zoom=zoom>=3?1:zoom+.5;render();};
  $('#rep-reset').onclick=()=>{zoom=1;render();};
  $('#rep-lock').onclick=()=>{locked=!locked;lockLabel();};
  $('#sample-prev').onclick=()=>{locked=true;select(selected-1,{play:true});lockLabel();};
  $('#sample-next').onclick=()=>{locked=true;select(selected+1,{play:true});lockLabel();};
  $('#sample-play').onclick=()=>{if(session.wantsPlay)stop();else{session.play(msg=>$('#sample-status').textContent=msg);$('#sample-play').textContent=tr('Pause','暂停');}};
  $('#sample-retry').onclick=()=>select(selected,{play:true});
  host.onkeydown=ev=>{if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(ev.key)){ev.preventDefault();locked=true;select(selected+(ev.key==='ArrowLeft'||ev.key==='ArrowUp'?-1:1),{play:true});lockLabel();}if(ev.key==='Enter'){locked=!locked;lockLabel();}if(ev.key==='Escape'){locked=false;stop();lockLabel();}};
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){locked=false;stop();lockLabel();}});
  const io=new IntersectionObserver(es=>{active=es[0].isIntersecting;if(active&&!session.elements[0]?.getAttribute('src'))select(selected);if(!active)stop();},{threshold:.05});io.observe($('.rep-workbench'));
  document.addEventListener('languagechange',()=>{stop();render();select(selected);lockLabel();});
  guardVisible($('.rep-workbench'),stop);render();select(0);
}
