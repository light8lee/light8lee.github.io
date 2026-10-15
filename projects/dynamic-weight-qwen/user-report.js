/* Playback only: all responses and augmented inputs are recorded GPU outputs. */
(() => {
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const data=userResults;
  const methods=Object.entries(data.playback).map(([value,m])=>[value,m.label]);
  const stageNames={updated:'用户更正后',stage_6:'首批 6 个',stage_12:'累计 12 个',stage_2:'首批 2 个',stage_4:'累计 4 个'};
  const kindNames={exact:'口令原问法',paraphrase:'换个问法问口令',application:'有序动作与口令',unknown:'未学习的相似概念',generic:'无关通用问题'};
  const state={method:'user_retrieval',stage:'updated',kind:'exact',fact:'concept_00'};
  const selector=(id,label,values,value)=>`<label>${label}<select id="${id}">${values.map(([v,l])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
  function output(r) {
    return `<p class="record-question">${esc(r.question)}</p><p class="output-label">assistant · 实际生成</p><div class="record-output ${r.success?'':'fail'}">${esc(r.answer)}</div><p class="record-status">记录判定：${r.success?'通过':'未通过'}${r.expected?` · 评分期望口令：${esc(r.expected)}`:''}${r.old_value_leak?' · 含旧口令':''} · 检索原话 ${r.memory_hits} 条</p><details><summary>检查 B 的实际输入，是否追加了旧信息？</summary><div class="actual-input">${r.actual_input_messages.map(m=>`<span class="input-role">${esc(m.role)}</span>${esc(m.content)}`).join('\n\n')}</div></details>`;
  }
  function renderSession(method='user_retrieval') {
    const r=data.playback[method].rows.find(r=>r.stage==='updated'&&r.kind==='exact'&&r.fact_id==='concept_00');
    $('sessionB').innerHTML=`<div class="record-player"><div class="player-controls session-method">${selector('sessionMethod','选择记忆方案',methods,method)}</div>${output(r)}</div>`;
  }
  function renderPlayer() {
    const pool=data.playback[state.method].rows;
    const stages=[...new Set(pool.map(r=>r.stage))].map(s=>[s,stageNames[s]||s]);
    let rows=pool.filter(r=>r.stage===state.stage&&r.kind===state.kind);
    if(!rows.some(r=>r.fact_id===state.fact))state.fact=rows[0].fact_id;
    const r=rows.find(r=>r.fact_id===state.fact);
    const facts=rows.map(r=>[r.fact_id,data.facts.find(f=>f.id===r.fact_id)?.name||r.question]);
    $('recordPlayer').innerHTML=`<div class="record-player"><div class="player-controls">${selector('playerMethod','方法',methods,state.method)}${selector('playerStage','写入阶段',stages,state.stage)}${selector('playerKind','题型',Object.entries(kindNames),state.kind)}${selector('playerFact','概念 / 问题',facts,state.fact)}</div>${output(r)}<p class="table-note">模型生成耗时 ${r.latency_s.toFixed(3)} 秒；单条时长不作性能基准。评分只按本实验规定，完整语义可直接阅读回答。</p></div>`;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    renderSession();renderPlayer();
    const checks=Object.values(data.verifications);
    $('auditSummary').innerHTML=`<div class="audit-grid"><div><b>${checks.filter(c=>c.base_unchanged).length} / ${checks.length}</b><span>主干参数前后不变</span></div><div><b>${checks.reduce((n,c)=>n+c.assistant_targets,0)}</b><span>人工 assistant 更新目标</span></div><div><b>${checks.filter(c=>c.write_process!==c.test_process).length} / ${checks.length}</b><span>A / B 独立进程</span></div></div>`;
    document.addEventListener('change',event=>{
      const id=event.target.id;
      if(id==='sessionMethod'){renderSession(event.target.value);$('sessionMethod').focus({preventScroll:true});return;}
      const keys={playerMethod:'method',playerStage:'stage',playerKind:'kind',playerFact:'fact'};
      if(keys[id]){state[keys[id]]=event.target.value;renderPlayer();$(id).focus({preventScroll:true});}
    });
  });
})();
