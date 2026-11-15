export const $=(s,r=document)=>r.querySelector(s);
export const $$=(s,r=document)=>[...r.querySelectorAll(s)];
export const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
export const zh=()=>document.documentElement.lang==='zh';
export const tr=(en,cn)=>zh()?cn:en;
export async function loadJSON(p){
  const r=await fetch(p,{signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new Error(`${p}: HTTP ${r.status}`);
  return r.json();
}
export function guardVisible(el,pause){
  const io=new IntersectionObserver(es=>{if(!es[0].isIntersecting)pause();},{threshold:0.05});io.observe(el);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
}
export function expand(el){
  if(el.classList.contains('expanded'))el.classList.remove('expanded');
  else{el.classList.add('expanded');el.querySelector('button')?.focus();}
}
