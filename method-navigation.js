import {timeline} from './method-state.js';
import {METHOD_SECONDS,clamp} from './method-motion.js';

export const methodChapters=[
  {start:0,end:3,jump:2},
  {start:3,end:5,jump:3},
  {start:5,end:12,jump:10},
  {start:12,end:20,jump:12}
];

// Timeline units are stages; 0.01 is 32 ms of illustrative animation time.
export const METHOD_SEEK_STEP=.01;
export function seekPosition(value){
  const n=Number(value);
  const bounded=Math.max(0,Math.min(timeline.length,Number.isFinite(n)?n:0));
  const position=Math.round(bounded*100)/100;
  const index=Math.min(timeline.length-1,Math.floor(position));
  // Decimal slider ticks must hit the same commit boundary in every stage.
  return{index,fraction:Math.round((position-index)*100)/100};
}

export function playbackPosition(index,fraction=0){
  const step=Math.max(0,Math.min(timeline.length-1,index));
  const position=step+clamp(fraction);
  return{
    seconds:position*METHOD_SECONDS,
    duration:timeline.length*METHOD_SECONDS,
    chapters:methodChapters.map(({start,end})=>({
      active:step>=start&&step<end,
      progress:clamp((position-start)/(end-start)),
      complete:position>=end
    }))
  };
}

export function animationTime(seconds){
  const n=Math.max(0,Math.floor(seconds));
  return`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
}
