import {initRetrievalMotion} from './retrieval-motion.js?v=20261119-recut';
import {$, tr, escapeHTML as escape, loadJSON, reduced} from './lib.js';

export function filterResults(rows, {model='all', split='all', level='all', task=''}={}) {
  const query=task.trim().toLowerCase();
  return rows.filter(row => (model==='all'||row.model===`RoboDemo-${model}`)
    &&(split==='all'||row.split===split)&&(level==='all'||row.level===level)
    &&row.task.toLowerCase().includes(query));
}

export function resultCSV(rows) {
  const fields=['model','checkpoint_step','split','task','level','successes','episodes','success_rate'];
  const cell=value=>`"${String(value).replaceAll('"','""')}"`;
  return [fields.join(','),...rows.map(row=>fields.map(key=>cell(row[key])).join(','))].join('\n')+'\n';
}

export function initRelease() {
  const theme=$('#theme-toggle');
  function themeLabel() {
    const dark=document.documentElement.dataset.theme==='dark';
    theme.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');
    theme.setAttribute('aria-pressed',String(dark));
    document.querySelector('meta[name="theme-color"]').content=dark?'#211b20':'#FFFCF8';
  }
  theme.onclick=()=>{
    const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=next;
    try {localStorage.setItem('robodemo-theme',next);} catch {}
    themeLabel();
  };
  themeLabel();
  let rows=[], filtered=[], page=0;
  const pageSize=20;
  function render() {
    filtered=filterResults(rows,{
      model:$('#filter-model').value,split:$('#filter-split').value,
      level:$('#filter-level').value,task:$('#filter-task').value,
    });
    const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
    page=Math.min(page,pages-1);
    $('#result-count').textContent=tr(
      `${filtered.length} task-level rows. Each row contains 10 complete episodes.`,
      `${filtered.length} 条任务级结果，每条对应 10 次完整评估。`);
    $('#result-rows').innerHTML=filtered.slice(page*pageSize,(page+1)*pageSize).map(row=>
      `<tr><th scope="row">${escape(row.model)}</th><td>${escape(row.split==='all'?'Full suite':row.split)}</td><td>${escape(row.task)}</td><td>${row.level}</td><td>${row.successes}</td><td>${row.episodes}</td><td><span class="sr-value" style="--sr:${row.success_rate}%">${Number(row.success_rate).toFixed(1)}</span></td></tr>`
    ).join('')||'<tr><td colspan="7">No matching results.</td></tr>';
    $('#result-page').textContent=`${page+1} / ${pages}`;
    $('#result-prev').disabled=page===0;$('#result-next').disabled=page===pages-1;
    $('#result-download').disabled=filtered.length===0;
  }
  for(const name of ['model','split','level','task'])$('#filter-'+name).addEventListener('input',()=>{page=0;render();});
  $('#result-prev').onclick=()=>{page--;render();};
  $('#result-next').onclick=()=>{page++;render();};
  $('#result-download').onclick=()=>{
    const url=URL.createObjectURL(new Blob([resultCSV(filtered)],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='robodemo-filtered-results.csv';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  loadJSON('data/task-level.json').then(data=>{rows=data;render();}).catch(error=>{
    $('#result-count').textContent=`Results could not load: ${error.message}`;
  });
  document.addEventListener('languagechange',render);
  initRetrievalMotion();
}
