(() => {
  'use strict';
  const data=window.memoryDiagnosis,root=document.querySelector('#diagnosticPlayer');
  if(!data||!root)return;
  const labels={write_context:'原写入上下文：user 前缀续写',fresh_user:'新会话：user 前缀续写',assistant_prefix:'新问题：assistant 前缀续写',fresh_question:'新问题：自然回答'};
  const h=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
  root.className='diagnostic-player';
  const controls=h('div',undefined,'player-controls'),panel=h('div');
  function select(title,values){const label=h('label',title),s=h('select');values.forEach(([value,text])=>{const o=h('option',text);o.value=value;s.append(o);});label.append(s);controls.append(label);return s;}
  const method=select('方法',Object.entries(data).map(([key,v])=>[key,v.name]));method.id='diagnosticMethod';
  const fact=select('概念',Array.from({length:12},(_,i)=>{const id='concept_'+String(i).padStart(2,'0');const r=data.kv_replay.rows.find(r=>r.fact_id===id&&r.stage==='stage_12'&&r.kind==='fresh_question');const q=r.actual_input_messages.at(-1).content;const match=q.match(/“([^”]+)”/);return [id,match?match[1]:id];}));fact.id='diagnosticFact';
  const condition=select('读出条件',Object.entries(labels));condition.id='diagnosticCondition';
  const stage=select('存储量',[['stage_12','12 个概念'],['stage_6','6 个概念（前6个）']]);stage.id='diagnosticStage';
  root.append(controls,panel);
  function detail(title,text){const node=h('details'),summary=h('summary',title),pre=h('pre',text,'diagnostic-prefix');node.append(summary,pre);return node;}
  function answerBlock(title,score,active){const a=h('article',undefined,active?'active':'');a.append(h('h3',title),h('p',score.answer||'（空输出）','answer'));const metric='完整口令：'+(score.key_hit?'命中':'未命中')+(score.mean_log_probability!==undefined?'；平均对数概率 '+score.mean_log_probability.toFixed(3)+'；目标 token top-1 '+score.top1_tokens+'/'+score.tokens:'');a.append(h('p',metric,'diagnostic-score'));return a;}
  function render(){
    panel.replaceChildren();const c=data[method.value];const isSix=stage.value==='stage_6';
    for(const option of fact.options)option.disabled=isSix&&Number(option.value.slice(-2))>=6;
    if(fact.selectedOptions[0].disabled)fact.value='concept_00';
    condition.options[3].disabled=isSix;if(isSix&&condition.value==='fresh_question')condition.value='assistant_prefix';
    const subset=c.rows.filter(r=>r.stage===stage.value&&r.fact_id===fact.value&&r.kind===condition.value);
    if(!subset.length){panel.append(h('p','这个条件没有实验记录。'));return;}
    const row=subset[0];panel.append(h('p','测试口令（仅展示判分目标）：'+(row.expected||data.kv_replay.rows.find(r=>r.fact_id===fact.value&&r.kind==='write_context').expected),'diagnostic-meta'));
    let scores=row.scores;
    if(!scores)scores=Object.fromEntries(subset.map(r=>[r.gain.toFixed(1),r]));
    const answers=h('div',undefined,'diagnostic-answers');
    for(const [gain,score] of Object.entries(scores))answers.append(answerBlock(gain==='0.0'?'零增益 / 冻结输出对照':gain==='1.0'?'原增益 / 已写入快照':gain+'倍读取增益',score,gain!=='0.0'));
    panel.append(answers);
    if(row.prefix_text)panel.append(detail('展开实际前缀（不含目标口令）',row.prefix_text));
    if(row.actual_input_messages)panel.append(detail('展开新会话实际输入',row.actual_input_messages.map(m=>m.role+'：'+m.content).join('\n\n')));
    if(row.address_hidden_cosine_to_write_context!==undefined)panel.append(h('p','读取位置与原写入前缀的隐藏状态余弦：'+row.address_hidden_cosine_to_write_context.toFixed(3)+(row.address_code_cosine_to_write_context!==undefined?'；随机投影编码余弦：'+row.address_code_cosine_to_write_context.toFixed(3):''),'diagnostic-meta'));
    const oracle=c.oracles.find(o=>o.fact_id===fact.value);
    if(oracle&&stage.value==='stage_12'){
      const box=h('div',undefined,'diagnostic-oracle');box.append(h('h3','同一案例：地址、门控与强制读出'));
      for(const [kind,probe] of Object.entries(oracle.probes)){
        const name=kind==='fresh_question'?'新问题':'原 user 正文起点';
        const candidates=method.value==='kv_replay'?'；候选 '+probe.entity_candidates+' 条（KV 无实体或词面过滤）':'；实体过滤后 '+probe.entity_candidates+' 条，词面过滤后 '+probe.lexical_candidates+' 条';
        box.append(h('p',name+'：门控'+(probe.activated?'开启':'关闭')+'；正确条目相似度 '+(probe.correct_similarity===null?'无完整条目':probe.correct_similarity.toFixed(3))+'；阈值 '+probe.threshold+candidates+'。'));
      }
      box.append(h('p','完整 user 原文仍在快照：'+(oracle.stored_full_explanation?'是':'否')+'；强制复制与原文完全相等：'+(oracle.forced_copy_exact_user_text?'是':'否')+'。这项操作绕过检索，不算自主回忆。'));
      box.append(detail('强制复制实际输出',oracle.forced_copy_answer||'没有完整原文可供强制读取。'),detail('原 user 起点实际输出',oracle.write_start_answer));
      for(const [key,ref] of Object.entries(oracle.source_user_reference))box.append(detail(({correct:'正确历史 user 原文',wrong:'错误概念的 user 原文',absent:'没有历史原文'})[key]+' → 冻结模型实际回答','输入原文：'+(ref.source_user_text||'（无）')+'\n\n回答：'+ref.answer));
      panel.append(box);
    }
  }
  [method,fact,condition,stage].forEach(s=>s.addEventListener('change',render));render();
})();
