// A generation owns its elements and play intent. Late promises cannot restart a newer selection.
export class MediaSession {
  constructor(){this.generation=0;this.intent=0;this.elements=[];this.wantsPlay=false;}
  replace(elements){
    this.pause();this.generation++;
    for(const v of this.elements){v.pause();v.removeAttribute('src');v.load();}
    this.elements=elements;
  }
  pause(){this.intent++;this.wantsPlay=false;for(const v of this.elements)v.pause();}
  async play(onError=()=>{}){
    const generation=this.generation,intent=++this.intent;this.wantsPlay=true;
    const results=await Promise.allSettled(this.elements.map(async v=>{
      let timer;
      const pending=v.play().then(()=>{
        // An older promise must not pause a newer Play on the same current element.
        if(!this.wantsPlay||!this.elements.includes(v))v.pause();
      });
      try{await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Media loading timeout')),15000);})]);}
      finally{clearTimeout(timer);}
    }));
    if(generation===this.generation&&intent===this.intent&&results.some(r=>r.status==='rejected')){
      this.pause();onError('Playback could not start or the connection is too slow. Press Retry or Play again.');
    }
  }
}
