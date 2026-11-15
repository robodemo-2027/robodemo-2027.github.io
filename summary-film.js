import {$,tr,loadJSON,guardVisible,reduced} from './lib.js';
export const filmTime=t=>`${String(Math.floor((Number.isFinite(t)?t:0)/60)).padStart(2,'0')}:${String(Math.floor((Number.isFinite(t)?t:0)%60)).padStart(2,'0')}`;
export const filmSource=quality=>`assets/video/summary-en-${quality==='720'?'720':'1080'}p.mp4`;
export function initSummaryFilm(){
  const film=$('#overview'),frame=$('#film-frame'),quality=$('#film-quality'),seek=$('#film-seek');
  const captionBox=$('#film-caption-text'),chapter=$('#film-chapter');
  let generation=0,playRequest=0,nativeFullscreen=false,chapters=[],plannedDuration=0;
  quality.value=innerWidth<768||navigator.connection?.saveData?'720':'1080';
  film.controls=false;frame.classList.add('custom-controls');
  function controls(){
    $('#film-toggle').textContent=film.paused?tr('Play','播放'):tr('Pause','暂停');
    $('#film-toggle').setAttribute('aria-label',film.paused?'Play research film':'Pause research film');
    $('#film-mute').hidden=film.muted;
    $('#film-mute').textContent=tr('Mute','静音');
    $('#film-current').textContent=filmTime(film.currentTime);
    $('#film-duration').textContent=filmTime(film.duration||plannedDuration);
    seek.value=String(film.currentTime||0);
    seek.setAttribute('aria-valuetext',`${filmTime(film.currentTime)} / ${filmTime(film.duration||plannedDuration)}`);
    if(chapters.length)chapter.value=String([...chapters].reverse().find(c=>film.currentTime>=c.start-.05)?.start||0);
  }
  function pause(){playRequest++;film.pause();controls();}
  function setFilm(time=film.currentTime||0,resume=false){
    pause();const current=++generation;
    const resumeRequest=playRequest;
    film.src=filmSource(quality.value);
    film.addEventListener('loadedmetadata',()=>{
      if(current!==generation)return;
      film.currentTime=Math.min(time,film.duration);seek.max=String(film.duration);captions();controls();
      // An offscreen/user pause while metadata loads cancels a pending resume.
      if(resume&&resumeRequest===playRequest)play();
    },{once:true});
    film.load();
  }
  async function play(sound=false){
    if(sound)film.muted=false;
    if(!film.getAttribute('src')){setFilm(0,true);return;}
    const request=++playRequest,current=generation;
    try{
      await film.play();
      if(current!==generation||request!==playRequest)return;
      $('#film-status').textContent='';controls();
    }catch{
      if(current!==generation||request!==playRequest)return;
      $('#film-status').textContent=tr('Playback did not start. Press Play or Retry.','播放未开始，请点击播放或重试。');controls();
    }
  }
  function renderCaptions(){
    const lang=$('#film-captions').value,track=[...film.textTracks].find(t=>t.language===lang);
    captionBox.lang=lang==='zh'?'zh':'en';
    captionBox.textContent=track&&track.mode!=='disabled'?[...(track.activeCues||[])].map(c=>c.text).join(' '):'';
  }
  function captions(){
    for(const t of film.textTracks)t.mode=t.language===$('#film-captions').value?(nativeFullscreen?'showing':'hidden'):'disabled';
    renderCaptions();
  }
  function jump(time){
    if(!film.getAttribute('src'))setFilm(time,false);
    else film.currentTime=Math.max(0,Math.min(time,film.duration||plannedDuration));
    controls();
  }
  for(const t of film.textTracks)t.addEventListener('cuechange',renderCaptions);
  film.addEventListener('timeupdate',()=>{controls();renderCaptions();});
  film.addEventListener('seeked',()=>{controls();renderCaptions();});
  film.addEventListener('emptied',()=>captionBox.textContent='');
  for(const event of ['play','pause','ended','volumechange'])film.addEventListener(event,controls);
  film.addEventListener('webkitbeginfullscreen',()=>{nativeFullscreen=true;captions();});
  film.addEventListener('webkitendfullscreen',()=>{nativeFullscreen=false;captions();});
  document.addEventListener('fullscreenchange',()=>{nativeFullscreen=document.fullscreenElement===film;captions();});
  document.addEventListener('languagechange',controls);
  $('#film-captions').onchange=captions;
  $('#film-sound').onclick=()=>play(true);
  $('#film-toggle').onclick=()=>film.paused?play():pause();
  $('#film-mute').onclick=()=>{film.muted=true;controls();};
  $('#film-replay').onclick=()=>{jump(0);play();};
  $('#film-retry').onclick=()=>setFilm(film.currentTime||0,true);
  quality.onchange=()=>setFilm(film.currentTime||0,!film.paused);
  seek.oninput=()=>jump(+seek.value);
  chapter.onchange=()=>jump(+chapter.value);
  film.addEventListener('error',()=>$('#film-status').textContent=tr('The film could not load. Try 720p or Retry.','视频加载失败，请尝试 720p 或重试。'));
  $('#film-full').onclick=async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else await frame.requestFullscreen();}
    catch{if(film.webkitEnterFullscreen)film.webkitEnterFullscreen();}
  };
  guardVisible(frame,pause);
  new IntersectionObserver(es=>{
    if(es[0].isIntersecting&&!film.getAttribute('src'))setFilm(0,!reduced()&&!navigator.connection?.saveData);
  },{threshold:.2}).observe(film);
  loadJSON('data/summary-film-en.json').then(data=>{
    plannedDuration=data.duration;seek.max=String(plannedDuration);
    chapters=data.chapters;chapter.replaceChildren(...chapters.map((c,i)=>{
      const o=document.createElement('option');o.value=String(c.start);o.textContent=`${filmTime(c.start)} / ${String(i+1).padStart(2,'0')} / ${c.title}`;return o;
    }));controls();
  }).catch(()=>{chapter.disabled=true;});
  captions();controls();
}
