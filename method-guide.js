// Derive copy from the rendered frame so dragging and playback tell the same story.
export function methodCue(v){
  const cue=(key,side,en,zh)=>({key,side,en,zh});
  const human=v.state.source==='human',f=v.f;
  if(v.phase==='query')return cue('query','neutral',
    'Start with initial RGB and the instruction.','从初始 RGB 观测与指令开始。');
  if(v.phase==='retrieve')return human?
    cue('human-input','reference','A human demonstration enters directly.','人类演示直接进入编码，无需检索。'):
    cue('robot-input','reference','Select a demonstration from the robot training bank.','从机器人训练库中选择兼容的示范。');
  if(v.phase==='encode')return f<.4?
    cue('reference-patches','reference','Image regions become reference tokens.','参考图像区域正在变成 token。'):
    cue('reference-tokens','reference','Tokens summarize meaning and motion.','参考 token 汇集语义与运动信息。');
  if(v.phase==='preload'){
    if(f<.4)return cue('reference-patches','reference','Image regions become reference tokens.','参考图像区域正在变成 token。');
    if(f<.68)return cue('reference-travel','reference','Reference tokens travel to Retrieval-TTT.','参考 token 正在进入 Retrieval-TTT。');
    if(f<.9)return cue('reference-update','reference','K/V updates reference fast weights.','K/V 正在更新参考 fast weights。');
    return cue('reference-stored','reference','Fused reference stored; no execution history yet.','融合参考已写入；此时还没有执行历史。');
  }
  if(v.phase==='freeze')return cue('reference-lock','reference',
    'Protect the reference; progress is still initialized.','保护参考终态；执行记忆仍为初始化状态。');
  if(v.phase==='read')return v.state.executionVersion===0?
    cue('read-initial','action','Read intent, then initialized progress.','先读参考意图，再读初始化的执行记忆。'):
    cue('read-updated','action','Read intent, then updated progress.','先读稳定意图，再读更新后的执行进度。');
  if(v.phase==='denoise')return cue('read-only','action',
    'Sample actions; both memories stay read-only.','采样动作时，两份记忆都只读、不写入。');
  if(v.phase==='predict')return cue('prediction','action',
    'Predict an action chunk, not an executed history.','预测动作块，不把它当作已执行历史。');
  if(v.phase==='execute')return cue('execute','action',
    'Apply only the selected action.','只执行最终选中的动作。');
  if(v.phase==='complete')return f<.55?
    cue('await-observation','progress','Wait for the executed transition to finish.','等待本次真实执行转移完成。'):
    cue('completed-observation','progress','New observation, state and preceding executed action.','获得新观测、新状态及前一步实际执行动作。');
  if(v.phase==='write'||v.phase==='advance'){
    const local=v.phase==='advance'?v.local:f;
    if(v.phase==='advance'&&local<.3)return cue('next-action','action',
      'Apply the next selected action, then observe.','执行下一个选中动作，再获取观测。');
    if(local<.4)return cue('progress-patches','progress',
      'A completed observation becomes progress tokens.','已完成转移的观测正在变成进度 token。');
    if(local<.68)return cue('progress-travel','progress',
      'Progress tokens travel to Execution-TTT.','进度 token 正在进入 Execution-TTT。');
    if(local<.9)return cue('progress-update','progress',
      'Update progress fast weights, never reference.','更新执行 fast weights，不回写参考记忆。');
    return cue('progress-stored','progress',
      `${v.state.executionVersion} completed ${v.state.executionVersion===1?'write':'writes'}; reference stays protected.`,
      `已完成 ${v.state.executionVersion} 次写入；参考记忆保持不变。`);
  }
  return cue('continue','action',
    'Same intent. Updated progress. Read both again.','稳定的意图、更新的进度，再次依次读取。');
}
