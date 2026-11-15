import {$,$$,tr,escapeHTML as e} from './lib.js';
export const models=['RoboDemo','ACT','DP'];
export function aggregate(data,level=4){
  return data.groups.map(g=>{
    const rows=g.tasks.map(name=>data.tasks.find(t=>t.task===name));
    const raw=Object.fromEntries(models.map(m=>[m,rows.reduce((a,t)=>a+t[m][level],0)/rows.length]));
    const best=Math.max(...Object.values(raw));
    return{...g,n:rows.length,raw,relative:Object.fromEntries(models.map(m=>[m,best?100*raw[m]/best:0]))};
  });
}
export function radius(v,relative){
  if(relative)return .12+.88*(Math.max(50,v)-50)/50;
  return v<=50?v/50*.15:v<=90?.15+(v-50)/40*.7:.85+(v-90)/10*.15;
}
const tableModels=['DP','ACT','RoboDemo'];
export const taskAbbreviations={
  KnifeBowlFork:'KnifeBwlFrk',LiftLidFromSkillet:'LiftSkilletLid',
  PickAppleBananaToBaskets:'P.ApplBanBsk',PickAppleBasket:'P.AppleBskt',
  PickAppleToScale:'P.AppleScale',PickFruitsToPlate:'P.FruitPlate',
  PickPillToRegions:'P.PillRegion',PickRemoteControl:'P.RemoteCtrl',
  PickTennisBallGolfBall:'P.TennisGolf',PlaceBookBookcase:'Pl.BookCase',
  PlaceBrushRest:'Pl.BrushRest',PlaceBurgerTray:'Pl.BurgerTray',
  PlaceChipsRack:'Pl.ChipsRack',PlaceClothBasket:'Pl.ClothBskt',
  PlaceCommodityRack:'Pl.CommRack',PlaceCupPlate:'Pl.CupPlate',
  PlaceFileFolder:'Pl.FileFolder',PlaceFoodScale:'Pl.FoodScale',
  PlaceMagazineFolder:'Pl.MagFolder',
  PlacePlateRack:'Pl.PlateRack',PlaceScrewdriver:'Pl.Screwdrvr',
  PourKetchupFries:'KetchupFries',PourLiquidCup:'LiquidCup',
  PourLiquidFilter:'LiquidFilter',PourLiquidMug:'LiquidMug',
  PutCubeOnScale:'CubeOnScale',
  OpenLiquidCap:'OpenLiqCap'
};
const scoreText=value=>(Math.round(value*10)/10).toFixed(1).replace(/^100\.0$/,'100');
export function tableAverages(tasks,metrics){
  if(!tasks.length)throw new Error('Cannot average an empty task group');
  return Object.fromEntries(tableModels.map(model=>[model,metrics.map((_,i)=>tasks.reduce((sum,task)=>sum+task[model][i],0)/tasks.length)]));
}
export function fullTableGroups(data){
  if(!data.paperTaxonomy)return[{id:'all',name:'All tasks',tasks:data.tasks}];
  const byName=new Map(data.tasks.map(task=>[task.task,task])),seen=new Set();
  const groups=data.paperTaxonomy.map(group=>({...group,tasks:group.tasks.map(name=>{
    if(!byName.has(name)||seen.has(name))throw new Error(`Invalid table taxonomy: ${name}`);
    seen.add(name);return byName.get(name);
  })}));
  if(seen.size!==data.tasks.length)throw new Error('Table taxonomy must cover every task exactly once');
  return groups;
}
export function findTableTasks(data,query){
  const normalize=value=>String(value).toLowerCase().replace(/[\s._-]+/g,'');
  const needle=normalize(query);
  return needle?fullTableGroups(data).flatMap(group=>group.tasks).filter(task=>[task.task,taskAbbreviations[task.task]||''].some(name=>normalize(name).includes(needle))):[];
}
export function renderFullTable(data){
  const metrics=data.metrics.map(metric=>metric==='Mean'?'Avg':metric),columns=1+metrics.length*3;
  const scores=task=>metrics.flatMap((metric,i)=>{
    // Rank unrounded task/group values; round only their displayed text.
    const best=metric==='Avg'?Math.max(...tableModels.map(m=>task[m][i])):null;
    return tableModels.map((m,j)=>{
      const winner=task[m][i]===best,classes=[j===0?'metric-start':'',winner?'best-score':''].filter(Boolean).join(' ');
      const value=scoreText(task[m][i]);
      return `<td${classes?` class="${classes}"`:''}>${winner?`<strong>${value}</strong>`:value}</td>`;
    });
  }).join('');
  const taskRow=task=>{
    const alias=taskAbbreviations[task.task];
    const label=alias?`<abbr title="${e(task.task)}" aria-label="${e(task.task)}">${e(alias)}</abbr>`:e(task.task);
    return `<tr data-task="${e(task.task)}"><th scope="row">${label}</th>${scores(task)}</tr>`;
  };
  const groups=fullTableGroups(data);
  const body=groups.map(group=>`<tbody data-reporting-group="${e(group.id)}">${data.paperTaxonomy?`<tr class="reporting-group"><th colspan="${columns}" scope="rowgroup"><div class="reporting-label">${e(group.name)} <span>${group.tasks.length} tasks</span></div></th></tr>`:''}${group.tasks.map(taskRow).join('')}${data.paperTaxonomy?`<tr class="group-average"><th scope="row" title="${e(group.name)} average">Group Avg</th>${scores(tableAverages(group.tasks,metrics))}</tr>`:''}</tbody>`).join('');
  const top=metrics.map(metric=>`<th colspan="3" scope="colgroup">${e(metric)}</th>`).join('');
  const sub=metrics.flatMap(metric=>tableModels.map((m,i)=>`<th scope="col"${i===0?' class="metric-start"':''} aria-label="${e(metric)} ${m==='RoboDemo'?'Ours':m}">${m==='RoboDemo'?'Ours':m}</th>`)).join('');
  const footer=data.paperTaxonomy?`<tfoot><tr class="overall-average"><th scope="row">Overall</th>${scores(tableAverages(data.tasks,metrics))}</tr></tfoot>`:'';
  return `<table aria-describedby="full-table-key full-table-notes" style="--full-table-columns:${columns}"><colgroup><col></colgroup>${metrics.map(()=>'<colgroup span="3"></colgroup>').join('')}<thead><tr><th rowspan="2" scope="col">Task</th>${top}</tr><tr>${sub}</tr></thead>${body}${footer}</table>`;
}
export function renderTableNotes(data){
  const aliases=fullTableGroups(data).flatMap(group=>group.tasks).filter(task=>taskAbbreviations[task.task]);
  return `<p>Group Avg: unweighted mean of tasks within that reporting group. Overall: mean across all 50 tasks, not an equal-weight mean of the five groups.</p><p><strong>Task abbreviations</strong> · P. = Pick; Pl. = Place. Full task names are also available on hover.</p><dl class="table-abbreviations">${aliases.map(task=>`<div><dt>${e(taskAbbreviations[task.task])}</dt><dd>${e(task.task)}</dd></div>`).join('')}</dl>`;
}
function initTableNavigation(data){
  const table=$('#full-table'),nav=$('#full-table-navigation'),groups=fullTableGroups(data);
  const rows=new Map($$('[data-task]',table).map(row=>[row.dataset.task,row]));
  let matches=[],matchIndex=-1,selectedGroup='',selectedRow=null,query='';
  function jump(row){
    const y=row.getBoundingClientRect().top-table.getBoundingClientRect().top+table.scrollTop;
    table.scrollTo({top:Math.max(0,y-$('thead',table).getBoundingClientRect().height-1),behavior:'instant'});
  }
  function selection(row){
    if(selectedRow)selectedRow.removeAttribute('data-located');
    selectedRow=row;
    if(row)row.dataset.located='true';
  }
  function status(message){
    $('[data-table-status]',nav).textContent=message;
    $$('[data-table-match]',nav).forEach(button=>button.disabled=matches.length<2);
    $$('[data-table-jump]',nav).forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tableJump===selectedGroup)));
  }
  function matchMessage(){
    if(!query.trim())return tr('50 tasks / 5 reporting groups. Locate a task without filtering the results.','50 个任务 / 5 个统计分类。定位任务不会筛掉其他结果。');
    if(!matches.length)return tr('No matching task. Try its full name or abbreviation; all 50 tasks remain shown.','没有匹配任务。可尝试全称或缩写，全部 50 个任务仍保留。');
    if(matchIndex<0)return tr(`${matches.length} matching tasks. Press Enter or Locate to jump.`,`${matches.length} 个匹配任务，按 Enter 或“定位”跳转。`);
    return tr(`${matchIndex+1} / ${matches.length} matches: ${matches[matchIndex].task}. All 50 tasks remain shown.`,`${matchIndex+1} / ${matches.length} 个匹配：${matches[matchIndex].task}。仍显示全部 50 个任务。`);
  }
  function locate(index){
    if(!matches.length)return;
    matchIndex=(index+matches.length)%matches.length;
    const task=matches[matchIndex],row=rows.get(task.task);
    selectedGroup=row.closest('tbody').dataset.reportingGroup;selection(row);jump(row);
    status(matchMessage());
  }
  function bind(){
    nav.innerHTML=`<div class="table-category-nav" role="group" aria-label="${tr('Jump to a reporting group','跳转到统计分类')}">${groups.map(group=>`<button type="button" data-table-jump="${e(group.id)}" aria-controls="full-table" aria-pressed="false">${e(group.name)} <span>${group.tasks.length}</span></button>`).join('')}<button type="button" data-table-jump="overall" aria-controls="full-table" aria-pressed="false">Overall <span>50</span></button></div>
      <form class="table-locator" role="search" aria-label="${tr('Locate a task in the complete table','在完整表格中定位任务')}"><label for="full-table-search">${tr('Find task','定位任务')}</label><input id="full-table-search" type="search" autocomplete="off" spellcheck="false" placeholder="${tr('Full name or abbreviation','全称或缩写')}" value="${e(query)}" aria-controls="full-table" aria-describedby="full-table-status"><button type="submit">${tr('Locate','定位')}</button><button type="button" data-table-match="-1" aria-label="${tr('Previous matching task','上一个匹配任务')}" disabled>&larr;</button><button type="button" data-table-match="1" aria-label="${tr('Next matching task','下一个匹配任务')}" disabled>&rarr;</button><button type="button" data-table-columns>${tr('Show Avg','查看 Avg')}</button></form>
      <p id="full-table-status" data-table-status role="status" aria-live="polite"></p>`;
    status(matchMessage());
    $$('[data-table-jump]',nav).forEach(button=>button.onclick=()=>{
      selectedGroup=button.dataset.tableJump;
      query='';matches=[];matchIndex=-1;$('#full-table-search',nav).value='';
      const row=selectedGroup==='overall'?$('.overall-average',table):$$('[data-reporting-group]',table).find(body=>body.dataset.reportingGroup===selectedGroup).firstElementChild;
      selection(null);jump(row);
      status(tr(`Viewing ${button.textContent.trim()}. All 50 tasks remain shown.`,`正在查看 ${button.textContent.trim()}，仍显示全部 50 个任务。`));
    });
    const input=$('#full-table-search',nav);
    input.oninput=()=>{
      query=input.value;matches=findTableTasks(data,query);matchIndex=-1;selection(null);
      status(matchMessage());
    };
    $('form',nav).onsubmit=event=>{event.preventDefault();locate(matchIndex+1);};
    $$('[data-table-match]',nav).forEach(button=>button.onclick=()=>locate(matchIndex+(+button.dataset.tableMatch)));
    $('[data-table-columns]',nav).onclick=()=>{
      const showing=table.scrollLeft>1;
      table.scrollTo({left:showing?0:table.scrollWidth-table.clientWidth,behavior:'instant'});
    };
    updateColumns();
  }
  function updateColumns(){
    const button=$('[data-table-columns]',nav);
    if(!button)return;
    button.hidden=table.scrollWidth<=table.clientWidth+1;
    button.textContent=table.scrollLeft>1?tr('Show L0','查看 L0'):tr('Show Avg','查看 Avg');
  }
  const resize=new ResizeObserver(()=>{
    if(table.clientWidth)table.style.setProperty('--table-viewport',`${table.clientWidth}px`);
    updateColumns();
  });
  resize.observe(table);
  table.addEventListener('scroll',updateColumns,{passive:true});
  document.addEventListener('languagechange',bind);bind();
}
export function initPerformance(data){
  let level=4,relative=true,selected=0;
  const colors={RoboDemo:'#D86689',ACT:'#C8A14E',DP:'#9E87A6'};
  const labelLines=[['Cleaning','(3)'],['Folding','(2)'],['Opening','(3)'],['Food-tool','handling (4)'],['Picking &','sorting (8)'],['Placement &','storage (17)'],['Pouring','(6)'],['Pressing','(2)'],['Measuring &','scanning (5)']];
  function point(i,r){const a=-Math.PI/2+i*Math.PI*2/9;return[330+Math.cos(a)*r,278+Math.sin(a)*r];}
  function showGroup(){
    const g=aggregate(data,level)[selected],metric=data.metrics[level];
    $('#group-info').innerHTML=`<p class="eyebrow">${g.id} / ${g.n} TASKS / ${metric}</p><h3>${e(g.name)}</h3><table><thead><tr><th>Method</th><th>${tr('Actual SR %','真实 SR %')}</th><th>${tr('Relative score','相对分数')}</th></tr></thead><tbody>${models.map(m=>`<tr><th>${m}</th><td>${g.raw[m].toFixed(2)}</td><td>${g.relative[m].toFixed(2)}</td></tr>`).join('')}</tbody></table><p>${tr('Click a vertex or group label to inspect membership.','点击顶点或组名检查组成任务。')}</p><div class="task-list">${g.tasks.map(e).join(' · ')}</div><details><summary>${tr('Task-level values in this group','此组的原始任务结果')}</summary><div class="table-scroll"><table><thead><tr><th>Task / ${metric}</th>${models.map(m=>`<th>${m}</th>`).join('')}</tr></thead><tbody>${g.tasks.map(n=>{const t=data.tasks.find(t=>t.task===n);return`<tr><th>${n}</th>${models.map(m=>`<td>${t[m][level].toFixed(1)}</td>`).join('')}</tr>`;}).join('')}</tbody></table></div></details>`;
  }
  function draw(){
    const mobile=matchMedia('(max-width: 620px)').matches;
    const groups=aggregate(data,level),ticks=relative?[50,60,70,80,90,100]:[0,50,60,70,80,90,100];
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${mobile?'80 10 500 540':'0 0 660 570'}" role="img" aria-label="Nine closed operation-group polygons; ${relative?'relative score, not success rate':'raw success rate with a piecewise-linear radius'}"><title>${data.metrics[level]} ${relative?'relative score':'success rate'}</title>`;
    for(const t of ticks){svg+=`<polygon points="${groups.map((_,i)=>point(i,180*radius(t,relative)).join(',')).join(' ')}" fill="none" stroke="#E8D5D0" stroke-width="1"/>`;if(t>0&&(!mobile||[50,80,100].includes(t)))svg+=`<text x="335" y="${278-180*radius(t,relative)+4}" fill="#896F68" font-family="Source, sans-serif" font-size="${mobile?19:12}">${t}</text>`;}
    groups.forEach((_,i)=>{let p=point(i,180);svg+=`<path d="M330 278L${p.join(' ')}" stroke="#F0E4DF" stroke-width="1"/>`;});
    for(const m of [...models].reverse()){
      const values=groups.map(g=>relative?g.relative[m]:g.raw[m]),under=relative&&values.some(v=>v<50);
      svg+=`<polygon data-model="${m}" points="${values.map((v,i)=>point(i,180*radius(v,relative)).join(',')).join(' ')}" fill="${colors[m]}" fill-opacity=".11" stroke="${colors[m]}" stroke-width="2.5" ${under?'stroke-dasharray="5 3"':''} stroke-linejoin="round"/>`;
      values.forEach((v,i)=>{const[x,y]=point(i,180*radius(v,relative));svg+=v<50&&relative?`<path d="M${x-5} ${y-5}L${x+5} ${y-5}L${x} ${y+4}Z" fill="${colors[m]}" data-underflow="true"/>`:`<circle cx="${x}" cy="${y}" r="3" fill="${colors[m]}"/>`;});
    }
    groups.forEach((g,i)=>{
      const[x,y]=point(i,236);const tooltip=`${g.name} (${g.n} tasks), ${data.metrics[level]}. ${models.map(m=>`${m}: SR ${g.raw[m].toFixed(3)}%, relative ${g.relative[m].toFixed(3)}`).join('; ')}`;
      svg+=`<g tabindex="0" role="button" data-group="${i}" aria-label="${e(tooltip)}" style="cursor:pointer"><title>${e(tooltip)}</title><circle cx="${x}" cy="${y}" r="32" fill="transparent"/><text x="${x}" y="${y-3}" text-anchor="middle" font-family="Source,sans-serif" font-size="${mobile?29:19}" fill="${selected===i?'#B95775':'#75564E'}">${(mobile?[g.id]:labelLines[i]).map((l,j)=>`<tspan x="${x}" dy="${j?21:0}">${e(l)}</tspan>`).join('')}</text></g>`;
      const[p1,p2]=point(i,180);svg+=`<circle data-group="${i}" cx="${p1}" cy="${p2}" r="15" fill="transparent" style="cursor:pointer"><title>${e(tooltip)}</title></circle>`;
    });
    $('#radar').innerHTML=svg+'</svg>'+(mobile?`<div class="radar-mobile-groups">${groups.map((g,i)=>`<button data-group="${i}">${g.id} · ${e(g.name)} (${g.n})</button>`).join('')}</div>`:'');
    $('#radar-title').textContent=`${data.metrics[level]} / ${tr(relative?'RELATIVE SCORE · GROUP BEST = 100':'RAW SUCCESS RATE (%)',relative?'相对分数 · 每组最佳 = 100':'原始成功率（%）')}`;
    $('#radar-scale-note').textContent=relative?tr('Relative 100 means group-best, not 100% success. Display: 50–100 → 12–100% radius; below-50 values use inward triangles and dashed guides. Tooltips report uncapped values.','相对分数 100 代表该组最佳，不是成功率 100%。显示将 50–100 映射到 12–100% 半径；低于 50 用向内三角及虚线标记，提示保留原值。'):tr('Disclosed piecewise radius: 0–50% → 0–15%; 50–90% → 15–85%; 90–100% → 85–100%. No raw values are clipped.','公开的分段半径映射：0–50% → 0–15%；50–90% → 15–85%；90–100% → 85–100%。不截断原始值。');
    $$('[data-group]',$('#radar')).forEach(el=>{
      const select=()=>{selected=+el.dataset.group;showGroup();$$('g[data-group] text',$('#radar')).forEach(t=>t.setAttribute('fill',+t.parentElement.dataset.group===selected?'#B95775':'#75564E'));};
      el.onclick=select;el.onmouseenter=select;el.onfocus=select;
      el.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();select();}};
    });
    showGroup();
  }
  $('#result-level').onchange=ev=>{level=+ev.target.value;draw();};
  $('#result-scale').onchange=ev=>{relative=ev.target.value==='relative';draw();};
  $('#full-table').innerHTML=renderFullTable(data);
  $('#full-table-notes').innerHTML=renderTableNotes(data);
  initTableNavigation(data);
  document.addEventListener('languagechange',draw);matchMedia('(max-width: 620px)').addEventListener('change',draw);draw();
}
