export const timeline = [
  ['query','Start with what is visible','从眼前的场景开始','Initial RGB + instruction. No query future is available.','初始 RGB 与指令，不读取当前轨迹的未来帧。'],
  ['retrieve','Choose a compatible procedure','选择兼容的操作过程','The robot training bank supplies a selected reference. Human input bypasses retrieval.','从机器人训练库选择参考；人类演示直接进入编码，无需检索。'],
  ['encode','Keep the meaning and the motion','同时保留语义与运动','H-GEC sampling encodes the complete reference into semantic and motion registers, then fuses them.','H-GEC 采样将完整参考编码为语义与运动 registers，再进行融合。'],
  ['preload','Store the complete demonstration intent','保存完整演示意图','Write the fused reference registers once per Action-DiT block, before rollout.','执行前，在每个 Action-DiT block 中写入一次融合后的参考 registers。',1],
  ['freeze','Protect the intended procedure','保护演示意图','Keep the terminal reference state fixed throughout the rollout. Execution state is still initialized.','保留参考终态，整个执行期间固定；执行记忆尚为初始化状态。'],
  ...[0,1].flatMap(c=>[
    ['read',`Read intent, then progress · loop ${c+1}`,`先读意图，再读进度 · 循环 ${c+1}`,'Attention → Retrieval read → Execution read → FFN, in every Action-DiT block.','每个 Action-DiT block：Attention → Retrieval read → Execution read → FFN。',c],
    ['denoise','Sample actions without writing memory','动作采样期间不写记忆','Five Euler evaluations are one action sample, not five robot executions.','五次 Euler 评估完成一次动作采样，不是五次机器人执行。',c],
    ['predict','A prediction is not an execution','预测不等于已执行','Predict a 30-action chunk. Retention and ensembling select the action actually applied.','预测 30 步动作块，再经保留和集成选择实际执行动作。',c],
    ['execute','Apply one selected action','执行选中的动作','Only the action actually applied can become interaction history.','只有真正执行的动作才能进入交互历史。',c],
    ['complete','Observe what actually happened','观察实际发生了什么','A completed transition supplies the new observation, new state, and preceding executed action.','完成的转移带来新观测、新状态及前一步实际执行动作。',c],
    ['write','Update what actually happened','更新真实执行进度','Visual encoding → execution Q-former → SA-AdaLN → one Execution-TTT write. No reference write.','视觉编码 → 执行 Q-former → SA-AdaLN → 单次 Execution-TTT 写入，不回写参考。',c],
    ['advance','Continue on the control clock','沿控制时钟继续','Three further selected actions each complete and commit once. A new chunk is retained every four steps.','之后三次动作分别执行、完成并各写入一次；每四个控制步保留新动作块。',c],
  ]),
  ['continue','Stable intent. Updated progress.','稳定的意图，更新的进度。','Two decision cycles, eight completed transitions. Next: read the same intent and the updated progress.','两次决策循环、八次已完成转移。接下来读取相同意图与更新后的进度。']
].map(([phase,title,cn,detail,detailCN,value],index)=>({phase,title,cn,detail,detailCN,value,index}));

export function initialState(){return{referenceVersion:0,referenceFrozen:false,executionVersion:0,completed:[],committed:[],controlStep:0,pending:null,phase:'query',source:'robot'};}
export function transition(previous,event){
  const s=structuredClone(previous);s.phase=event.phase;
  if(event.phase==='preload'){
    if(s.referenceFrozen)throw new Error('Reference is frozen');
    if(event.value!==1||s.referenceVersion!==0)throw new Error('Reference is preloaded once');
    s.referenceVersion++;
  }
  if(event.phase==='freeze'){if(s.referenceVersion!==1)throw new Error('Incomplete preload');s.referenceFrozen=true;}
  if(['read','denoise','predict','execute','complete','write','advance','continue'].includes(event.phase)&&!s.referenceFrozen)throw new Error('Read before preload');
  if(event.phase==='complete'){s.pending=s.controlStep+1;s.completed.push(s.pending);}
  if(event.phase==='write'){
    if(s.pending===null||!s.completed.includes(s.pending)||s.committed.includes(s.pending))throw new Error('Only uncommitted completed transitions can write');
    s.committed.push(s.pending);s.controlStep=s.pending;s.executionVersion++;s.pending=null;
  }
  if(event.phase==='advance'){
    for(let i=0;i<3;i++){s.controlStep++;s.completed.push(s.controlStep);s.committed.push(s.controlStep);s.executionVersion++;}
  }
  return s;
}
export function stateAt(index,source='robot'){
  let s=initialState();s.source=source;
  for(const e of timeline.slice(0,index+1))s=transition(s,e);
  return s;
}
