export const DETAIL_SECONDS=2.8;
export const detailSteps={
  block:[
    {label:['Attention','注意力'],title:['Start from the current context.','从当前上下文出发。'],body:['Sink, state and noised-action tokens attend to the current policy context. The video histories are not appended to this action sequence.','sink、state 与带噪动作 tokens 先读取当前策略上下文；两路视频历史不会作为前缀拼接进动作序列。'],formula:'H_attn = Attention(H)',token:'H'},
    {label:['Read intent','读取意图'],title:['Read what should happen first.','先读应该发生什么。'],body:['Retrieval-TTT adds a gated dynamic-delta read to the attention output. Its terminal reference state stays fixed throughout the rollout.','Retrieval-TTT 将门控后的 dynamic-delta 读取结果加入注意力输出。预加载后的参考终态在整个 rollout 中保持固定。'],formula:'H_R = H_attn + tanh(g_R) * Delta_R',token:'H_R'},
    {label:['Read progress','读取进度'],title:['Refine that same representation.','再修正同一份动作表征。'],body:['Execution-TTT queries the already reference-conditioned H_R, not the original attention output. This is a serial refinement, not two parallel residuals.','Execution-TTT 查询已经读取参考的 H_R，而不是原始注意力输出。这是串行修正，不是两个并行残差相加。'],formula:'H_E = H_R + tanh(g_E) * Delta_E',token:'H_E'},
    {label:['FFN','前馈网络'],title:['Continue through the action block.','继续通过动作网络。'],body:['The unchanged feed-forward residual processes the refined representation. Neither memory is updated anywhere in this denoising evaluation.','原有前馈残差处理修正后的表征。本次去噪评估的任何环节都不会更新两份记忆。'],formula:'H_next = FFN residual(H_E)',token:'H'}
  ],
  cross:[
    {label:['Context to K/V','上下文到 K/V'],title:['The context supplies the writer.','写入内容来自上下文。'],body:['Encoded context U is projected into K and V. The self-supervised target uses LN(V - K); no action-generation token becomes a writer input.','编码后的上下文 U 投影为 K 与 V，自监督目标由 LN(V - K) 构造；动作生成 tokens 不会成为 writer 的输入。'],formula:'K = norm(W_K U); V = W_V U',token:'U'},
    {label:['Update fast state','更新快权重'],title:['Change a small learner, not the whole policy.','只更新小型 learner，而非整个策略。'],body:['The reconstruction objective updates only this fast MLP state: W1, b1, W2 and b2. Slow weights and shared Q/K/V/O projections are not stepped by the inner optimizer.','重建目标只更新这份 fast MLP 的 W1、b1、W2、b2。slow weights 和共享 Q/K/V/O 投影不接受内层优化器更新。'],formula:'phi_next = TTT-Writer(phi, U)',token:'K/V'},
    {label:['Query without writing','只读查询'],title:['A different stream asks the question.','由另一条 token 流发起查询。'],body:['The action expert forms Q from its sink, state and noised-action tokens. Querying the stored context changes the readout, not the fast weights.','动作专家的 sink、state 和带噪动作 tokens 生成 Q。查询已有上下文只产生读取结果，不改变 fast weights。'],formula:'q = norm(W_Q(H + read_role))',token:'Q'},
    {label:['Return a delta','返回增量'],title:['Read the change relative to initialization.','读取相对于初始化的增量。'],body:['The reader subtracts the initial-state response under the same query and role. An unwritten or reset memory contributes exactly zero, not fabricated history.','Reader 在相同 query 和 role 下减去初始化状态的响应。尚未写入或已重置的记忆贡献恰为零，不伪造历史。'],formula:'Delta = Read(phi, H) - Read(phi_0, H)',token:'D'}
  ],
  encoding:[
    {label:['Sample','采样'],title:['One reference. Two frame groups.','一个参考，两组采样帧。'],body:['The complete reference video supplies sparse semantic frames and a dense, consecutive action slice. Both sample groups share one timeline. The real frame indices illustrate spacing and continuity, not configured sample counts.','同一个参考片段采样出稀疏语义帧与稠密、连续的动作切片，两种采样共享同一条时间轴。真实源帧编号用于说明间隔与连续性，不代表模型配置的采样数量。'],formula:'complete reference -> {sparse frames, consecutive clip}',token:'U'},
    {label:['Encode','编码'],title:['Separate semantics from continuous motion.','分别编码语义与连续运动。'],body:['Sparse frames enter qwen3-vl-vision-tower for visual semantics. The dense consecutive slice enters v-jepa2-encoder for temporal motion. Both encoders remain frozen; the reference encoders do not take the task prompt.','稀疏帧交给 qwen3-vl-vision-tower 编码视觉语义，稠密连续动作切片交给 v-jepa2-encoder 编码时序运动。两路编码器均冻结，参考编码器不接收任务提示词。'],formula:'S = Qwen3-VL-Vision(sparse); M = V-JEPA2(dense)',token:'U'},
    {label:['Resample','重采样'],title:['Compress both streams to registers.','把两条 token 流压缩为 registers。'],body:['Separate semantic and motion Q-formers resample valid source tokens. Their fixed-size outputs provide a stable interface independent of raw video length.','独立的语义和运动 Q-former 对有效源 tokens 重采样；固定数量的输出形成不随原始视频长度增长的接口。'],formula:'A_S = SemResampler(S_p); A_M = MotionResampler(M_p)',token:'U'},
    {label:['Fuse','融合'],title:['Keep semantics; add a gated motion residual.','保留语义基底，加入门控运动残差。'],body:['The two register streams from the complete reference fuse into U_R for Retrieval-TTT. Preloading retains a fast-weight state, not a video prefix.','来自同一片段的两路 registers 融合为 U_R，送入 Retrieval-TTT。预加载保留的是快权重状态，而非视频前缀。'],formula:'U_R = A_S + tanh(alpha_M) * G * A_M',token:'U'}
  ]
};

export function detailFrame(kind,position=0,role='reference'){
  const steps=detailSteps[kind];
  if(!steps)throw new Error(`Unknown detail: ${kind}`);
  if(!Number.isFinite(position))throw new Error('Non-finite detail position');
  if(!['reference','progress'].includes(role))throw new Error(`Unknown memory role: ${role}`);
  const p=Math.max(0,Math.min(steps.length,position));
  const index=Math.min(steps.length-1,Math.floor(p)),fraction=Math.round((p-index)*1e10)/1e10;
  const committed=kind==='cross'&&(index>1||(index===1&&fraction>=.85));
  return{index,fraction,step:steps[index],writeActive:kind==='cross'&&index===1&&fraction<.85,
    referenceWrites:committed&&role==='reference'?1:0,
    executionWrites:committed&&role==='progress'?1:0,
    actionWrites:0,referenceFrozen:kind==='block',executionFrozen:kind==='block'};
}

export function detailClockState(completed=0){
  if(!Number.isFinite(completed))throw new Error('Non-finite control step');
  const step=Math.max(0,Math.min(8,Math.floor(completed)));
  return{completed:step,executionWrites:step,referenceWrites:4,referenceFrozen:true,
    denoisingWrites:0,eulerEvaluations:5,chunkLength:30,retentionStride:4,maxRetained:4,
    completedIds:Array.from({length:step},(_,i)=>i+1)};
}

const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
export const encodingSamples={semantic:[0,108,212],motion:[90,91,92,93,94,95]};

export function encodingSampleFrame(position){
  const frame=detailFrame('encoding',position);
  return Object.fromEntries(Object.entries(encodingSamples).map(([branch,frames])=>{
    const cycle=frame.index===0?frame.fraction*frames.length:frames.length;
    const index=Math.min(frames.length-1,Math.floor(cycle)),fraction=Math.min(1,cycle-index);
    return[branch,{index,frame:frames[index],travel:smooth(fraction),
      cropOpacity:frame.index===0?1-smooth((fraction-.8)/.2):0,
      packetOpacity:frame.index===0?1-smooth((fraction-.82)/.18):0,
      size:30-10*smooth(fraction),active:frame.index===0}];
  }));
}

export function encodingSamplePosition(branch,index){
  const frames=encodingSamples[branch];
  if(!frames||!Number.isInteger(index)||index<0||index>=frames.length)throw new Error('Invalid encoding sample');
  return(index+.22)/frames.length;
}
export function encodingFlowFrame(position){
  const {index,fraction:f}=detailFrame('encoding',position);
  const tokens=Array.from({length:3},(_,i)=>{
    const phase=(f-i*.15)/.65;
    return{travel:smooth(phase),opacity:index===1?smooth(phase/.12)*(1-smooth((phase-.84)/.16)):0};
  });
  const registers=Array.from({length:6},(_,i)=>index<2?0:index>2?1:smooth((f/.58*6-i)/.75));
  const fused=Array.from({length:6},(_,i)=>index===3?smooth(((f-.6)/.4*6-i)/.75):0);
  return{tokens,registers,fused,packetTravel:index===2?smooth((f-.6)/.34):smooth((f-.12)/.44),
    packetOpacity:index===2?smooth((f-.6)/.1)*(1-smooth((f-.9)/.1)):index===3?smooth((f-.12)/.1)*(1-smooth((f-.5)/.1)):0,
    label:index===2?'A':index===3?'U':'',fusing:index===3&&f>.12&&f<.85};
}
const blockInputs=['H','H_attn','H_R','H_E'];
const blockOutputs=['H_attn','H_R','H_E','H_next'];
const weightStart=[.35,.62,.26,.48,.55,.3,.68,.4,.28,.58,.38,.65];
const weightEnd=[.84,.43,.71,.56,.39,.89,.53,.78,.64,.36,.91,.47];
const guideCopy={
  block:[
    [['Current-context tokens enter attention.','当前上下文 tokens 进入注意力层。'],['Attention forms H_attn. Neither memory is written.','注意力层形成 H_attn，两份记忆均不写入。'],['H_attn is ready for the reference read.','H_attn 准备读取参考记忆。']],
    [['H_attn reaches the reference reader.','H_attn 到达参考 reader。'],['The purple delta returns from the fixed reference state.','紫色增量从固定的参考状态返回。'],['H_R now carries reference intent; the memory is unchanged.','H_R 已包含参考意图，记忆本身没有变化。']],
    [['The progress reader receives H_R, not H_attn.','进度 reader 接收 H_R，而非 H_attn。'],['The pink delta refines the same action representation.','粉色增量继续修正同一份动作表征。'],['H_E includes intent and progress. Both memories remain fixed.','H_E 同时包含意图与进度，两份记忆仍固定。']],
    [['The refined H_E enters the feed-forward residual.','修正后的 H_E 进入前馈残差。'],['The action representation continues through the block.','动作表征继续通过当前 block。'],['Ready for the next block. Zero memory writes.','准备进入下一 block，记忆写入次数为零。']]
  ],
  cross:[
    [['A crop from the real source frame becomes a context token.','真实源帧中的图像小块变成上下文 token。'],['The crop fades into U before the fixed K/V projections.','图像小块在固定 K/V 投影前转化为 U。'],['Context supplies K/V. The action stream supplies no writer tokens.','上下文提供 K/V，动作流不提供 writer tokens。']],
    [['K/V travels toward the small fast-weight learner.','K/V 移向小型 fast-weight learner。'],['Only the illustrative fast-weight pattern changes.','仅示意的快权重图案发生变化。'],['One illustrative write is complete. Its pattern now stays fixed.','一次示意写入已完成，随后图案保持固定。']],
    [['Action tokens form the query Q.','动作 tokens 形成查询 Q。'],['Q reads the stored state without changing it.','Q 读取已有状态，不改变状态本身。'],['The same query also reads the learned initialization.','同一查询也读取可学习初始化。']],
    [['Compare the two responses under the same query and role.','比较相同查询和 role 下的两份响应。'],['Return only the difference to the action stream.','只把响应差值送回动作流。'],['A read returns a delta. It never performs another write.','读取返回增量，不会执行第二次写入。']]
  ],
  encoding:[
    [['Sample both frame groups from the same complete reference.','从同一个片段采样两组帧。'],['Spaced semantic frames; adjacent frames for continuous motion.','语义帧稀疏间隔，动作帧相邻连续。'],['Send sparse frames to Qwen3-VL and the dense slice to V-JEPA2.','稀疏帧进入 Qwen3-VL，稠密切片进入 V-JEPA2。']],
    [['Two frozen visual encoders process their own inputs.','两个冻结的视觉编码器分别处理各自输入。'],['Semantic and temporal tokens travel to separate Q-formers.','语义与时序 tokens 移向独立的 Q-former。'],['No task prompt is injected into either reference encoder.','两路参考编码器都不注入任务提示词。']],
    [['Each Q-former resamples its source tokens.','每个 Q-former 对各自源 tokens 重采样。'],['Both streams become fixed-width register interfaces.','两路流都变成固定数量的 register 接口。'],['The registers are ready for gated fusion.','Registers 准备进行门控融合。']],
    [['Keep the semantic base; add the gated motion residual.','保留语义基底，加入门控运动残差。'],['The fused reference registers form U_R.','融合后的参考 registers 形成 U_R。'],['One reference, one fused interface to Retrieval-TTT.','一个片段融合为一份参考接口，送入 Retrieval-TTT。']]
  ]
};

export function detailPresentation(kind,position,role='reference'){
  const frame=detailFrame(kind,position,role),f=frame.fraction;
  const phase=f<.35?0:f<.85?1:2;
  const weightMix=frame.index<1?0:frame.index>1?1:smooth((f-.45)/.4);
  return{
    phase,guide:guideCopy[kind][frame.index][phase],
    packetProgress:smooth(kind==='block'?f/.32:frame.index===1&&kind==='cross'?f/.5:(f-.06)/.84),
    packetLabel:kind==='block'?(f<.85?blockInputs[frame.index]:blockOutputs[frame.index]):frame.step.token,
    cropOpacity:kind==='cross'&&frame.index===0?1-smooth((f-.18)/.45):0,
    cropSize:kind==='cross'&&frame.index===0?38-12*smooth(f/.65):26,
    readPulse:kind==='block'&&[1,2].includes(frame.index)&&f>=.35&&f<.85,
    readProgress:smooth((f-.35)/.5),
    // These fixed patterns explain parameter updates, never measured weights or capacity.
    weightPattern:weightStart.map((value,i)=>value+(weightEnd[i]-value)*weightMix)
  };
}

export function advanceDetail(position,elapsedMS,speed=1,replayStage=null){
  if(![position,elapsedMS,speed].every(Number.isFinite)||speed<=0)throw new Error('Invalid detail playback');
  if(replayStage!==null&&(!Number.isInteger(replayStage)||replayStage<0||replayStage>3))throw new Error('Invalid replay stage');
  const next=Math.max(0,position)+Math.max(0,Math.min(100,elapsedMS))*speed/(DETAIL_SECONDS*1000);
  const finished=replayStage!==null&&next>=replayStage+1;
  return{position:finished?replayStage+1-.000001:replayStage!==null?next:next%4,finished};
}
