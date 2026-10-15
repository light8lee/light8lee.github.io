/* Recorded experiment playback. No model inference or invented measured values. */
(() => {
  const ids = ['residual_hebbian','residual_oja','vocab_hebbian','vocab_hebbian_balanced','vocab_delta','vocab_ema','kv_replay','token_knn'];
  const stems = ['01-residual-hebbian','02-residual-oja','03-vocab-hebbian','04-vocab-hebbian-balanced','05-vocab-delta','06-vocab-ema','07-kv-replay','08-token-knn'];
  const explanations = [
    ['在选定 Decoder 层注册 hook。先把层输出归一化、投影到低秩 code，再用同一前向的 pre/post 活动外积更新快权重。下一轮从矩阵读出方向，加回 hidden，随后继续后面的层。','像把经常一起活跃的连接加粗，但更新并不知道“苍羽-17”才是目标。事实从第一阶段就没写进去，不能把失败解释为后来遗忘。'],
    ['读取路径与 residual Hebbian 相同。写入时多减去与输出活动平方相关的抑制项，避免强连接无限增长；读取仍在 Decoder 残差侧路进行。','像给越来越强的连接加刹车。数值更稳定了，却仍没有告诉插件正确答案是什么，所以没有解决事实写入。'],
    ['在 LM Head 旁路收集答案位置之前的 hidden，并用 teacher mask 对齐真正的下一 token。把 key 累加进目标 token 对应的词表列；下一轮用查询 key 乘矩阵，叠加到基础 logits。','这次确实知道答案 token，但所有事实共用列。数字、符号和公共句式反复累积，目标词变强不等于正确事实可被区分。'],
    ['保留 Hebbian 的 key→词表写入，对常见 token 按历史次数的平方根倒数降低写入量，读取时再归一化词表列。','它压住了高频词的音量，却没有补上事实身份。30 条实验只答对 2/60；“相同 token 属于哪条事实”仍然混在一起。'],
    ['先计算 one-hot 教师目标减去当前快权重预测的局部误差，再以 KᵀE 直接修正共享矩阵。主干只提供 key，不接收梯度。','像只改答错的部分，而不是反复累加。但邻近地址共享有限秩空间，修正这一条也可能改坏另一条，本配置仍未可靠写入。'],
    ['把同一个目标 token 的上下文 key 求均值，为该 token 保存移动平均原型。查询与原型越接近，该 token 的动态 logit 越高。','像把许多人的收件地址平均成一个地址。事实身份、答案位置和版本被抹平，召回仅 2/60，通用问答也被共享输出偏置污染。'],
    ['用答案首 token 前的 hidden 作为整条问答的 key，完整答案序列作 value。首步检索一个槽位并锁定，之后每步给该槽位对应 token 加偏置。','独立槽位保护了答案顺序，但连续地址可能把霁舟-99认成霁舟-2。30 条召回 90%，6 个未学习近邻却全部误触发，覆盖只有 70%。'],
    ['每个答案位置记录 key、目标 token、group、step 与实体/上下文标签。首步先过实体、稀有 token 指纹、可选视觉门控，再做近邻检索；后续只在同 group、step 内投票。覆盖旧 group 也要求身份与上下文匹配。','身份解决“找谁”，hidden 处理“怎么问”，group/step 保持答案顺序。不命中就返回基础 logits。成功依赖这些显式存储与门控，尚不能说明知识已融合进 Qwen 参数。']
  ];
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct = x => `${(x * 100).toFixed(1).replace('.0','')}%`;
  const stats = (i,s) => i === 7 ? evidence.models['0.6B'][`stage_${s}`] : i === 6 ? evidence.kv[`stage_${s}`] : evidence.initial[ids[i]][`stage_${s}`];
  const metrics = entries => `<div class="result-metrics">${entries.map(([n,v])=>`<div><b>${esc(v)}</b><span>${esc(n)}</span></div>`).join('')}</div>`;
  const table = (heads,rows) => `<table><thead><tr>${heads.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  function recall() {
    const stage = Number($('recallStage').value), kind = $('recallKind').value;
    const r = evidence.recallRows.find(r => r.stage===stage && r.kind===kind && (kind==='near_control' ? r.fact_id==='near_control_1' : kind==='generic_control' ? r.fact_id==='generic_control_1' : r.fact_id==='code_01'));
    const rejected = r.retrieval_slot === -1;
    $('recallOutput').innerHTML = `<article><h3>这次给模型的问题</h3><p class="record-question">${esc(r.question)}</p><p class="record-meta">当前已写入 ${stage*10} 条事实。霁舟-2 的记录为 <b>${stage===3?'紫杉-117':'苍羽-17'}</b>。${stage===3?'原值“苍羽-17”已被定向覆盖。':'还没有冲突覆盖。'}</p></article><article><span class="record-badge ${rejected?'reject':''}">${rejected?'记忆未命中 · 由基础模型回答':'命中记忆 · 逐 token 注入'}</span><p class="record-answer">${esc(r.answer)}</p><p class="record-meta">${r.expected?'期望值：'+esc(r.expected)+' · ':''}记录结果：${r.success?'通过':'未通过'} · ${rejected?'未选中槽位':'检索相似度 '+r.retrieval_similarity.toFixed(4)}<br>原始生成用时 ${r.latency_s.toFixed(3)} s（单条记录，非性能基准）</p></article>`;
  }
  function methodDetail() {
    const i = currentMethod, m = stats(i,3);
    $('methodExplanation').innerHTML = `<p><strong>怎么接进模型：</strong>${explanations[i][0]}</p><p class="method-stat">30 条 / 60 问：召回 ${pct(m.overall_rate)} · 近邻拒绝 ${pct(m.near_control_clean_rate)} · 覆盖成功 ${pct(m.overwrite_success_rate)}</p><p><strong>为什么会这样：</strong>${explanations[i][1]}</p><a href="docs/architecture-explained-guide.html">阅读完整实现讲解 →</a>`;
    const image = `docs/diagrams/${stems[i]}.svg`;
    $('methodDiagram').src = image; $('methodDiagram').alt = `${methods[i].title} 的写入与读取架构图`;
    $('methodDiagramLink').href = image;
    workedExample();
  }
  function workedExample() {
    const example=methodExamples[currentMethod];
    $('workedStory').textContent=example.steps[currentStep];
    $('workedNumbers').textContent=example.numbers;
    $('workedMeaning').textContent=example.meaning;
  }
  function chart() {
    const stage = Number($('resultStage').value);
    $('methodChart').innerHTML = ids.map((id,i) => {
      const m=stats(i,stage);
      return `<div class="chart-row"><div class="chart-label">${methods[i].title}<small>${i===7?'最终实体门控版本':i===6?'评估修正版本':'原始方法对照'}</small></div><div class="chart-bars">${[['事实召回',m.overall_rate,''],['近邻拒绝',m.near_control_clean_rate,'green']].map(([label,value,color])=>`<div class="measured-bar ${color}" aria-label="${methods[i].title} ${label} ${pct(value)}"><div class="rail"><i style="width:${value*100}%"></i></div><span>${pct(value)}</span></div>`).join('')}</div></div>`;
    }).join('');
    $('metricTable').innerHTML=table(['方法','问题数','召回','旧事实保持','新增写入','覆盖','混淆','旧值泄漏','近邻拒绝'],ids.map((id,i)=>{
      const m=stats(i,stage);return [methods[i].title,m.fact_tests,pct(m.overall_rate),stage===1?'不适用':pct(m.old_retention_rate),pct(m.new_acquisition_rate),stage===3?pct(m.overwrite_success_rate):'不适用',pct(m.confusion_rate),stage===3?pct(m.old_value_leak_rate):'不适用',pct(m.near_control_clean_rate)];
    }).concat([['Token kNN 原始版本',evidence.initial.token_knn[`stage_${stage}`].fact_tests,pct(evidence.initial.token_knn[`stage_${stage}`].overall_rate),'—','—','—','—','—','—']]));
  }
  function model() {
    const size=$('modelSize').value,m=evidence.models[size].stage_3;
    $('modelResult').innerHTML=metrics([['总体召回',pct(m.overall_rate)],['旧事实保持',pct(m.old_retention_rate)],['覆盖成功',pct(m.overwrite_success_rate)]])+`<p>近邻拒绝 ${pct(m.near_control_clean_rate)} · 混淆 ${pct(m.confusion_rate)}<br>第三阶段记忆文件约 ${{'0.6B':'2.68','1.7B':'4.51','4B-FP8':'5.43'}[size]} MB。</p>`;
  }
  function visual() {
    const id=$('visualInput').value, calibrated=$('visualThreshold').value==='0.999', unseen=id.startsWith('unseen');
    const rows=calibrated?evidence.calibratedRows:evidence.visualRows;
    const r=rows.find(r=>r.id===id&&r.kind===(unseen?'unseen_image':'heldout_paraphrase'));
    $('visualImage').src='images/'+(unseen?'unseen-000':`memory-${id.split('_')[1]}`)+'.png';
    $('visualImage').alt=unseen?'从未写入记忆的视觉控制图片':`已学习合成卡片 ${id}`;
    $('visualResult').innerHTML=`<span class="record-badge">实测门限 ${calibrated?'0.999':'0.995'} · ${unseen?'未学习图片控制':'未见问法召回'}</span><h3>${unseen?'这张图没有写入过密钥':'换个问法，还能找回密钥'}</h3><p class="record-answer">${esc(r.answer)}</p><p class="record-meta">${r.expected?'期望：'+esc(r.expected)+' · ':''}记录判定：${r.success?'通过':'误触发'}<br>图片上下文相似度 ${r.context_similarity?.toFixed(6)??'未记录'}</p>${metrics([['48 张图精确召回','100%'],['24 张未见图正确拒绝',calibrated?'24 / 24':'18 / 24'],['24 个无图输入正确拒绝','24 / 24']])}<p>8×8 RGB 签名负责辨认图片实例。${calibrated?'门限收紧后，这组未见图全部被挡住。':'初始门限使 6 张未见图错误借用了已有记忆。'} 回答密钥来自观察时写入的关联。</p>`;
    const question = document.createElement('p');
    question.className = 'record-meta';
    question.textContent = unseen ? '实际问题：What is the private key assigned to this visual card? Answer only the key.（这张卡片分配的密钥是什么？只回答密钥。）' : '实际未见问法：Which confidential code belongs to the card shown here? Code only.（图中卡片对应哪个保密码？只回答密码。）';
    $('visualResult').insertBefore(question, $('visualResult').querySelector('.record-answer'));
  }
  function regression() {
    const id=$('regressionMethod').value,m=evidence.probe[id],r=evidence.probeExamples[id];
    $('regressionResult').innerHTML=`<article><h3>同一组 20 题 MMLU</h3>${metrics([['写入前',pct(m.before_accuracy)],['写入后',pct(m.after_accuracy)],['输出变化',pct(m.output_change_rate)]])}<p>正确 → 错误：${m.regression_count} 题。${m.output_change_rate===0?'这组输出未改变；还需要结合事实召回判断记忆是否有效。':'准确率之外，还应检查每一道题的输出漂移。'}</p></article><article><h3>逐题记录：${esc(r.id)}</h3><p class="record-meta">期望选项 ${esc(r.expected)} · 原始输出（保留生成长度）</p><p>写入前</p><pre>${esc(r.before_output)}</pre><p>写入后</p><pre>${esc(r.after_output)}</pre></article>`;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    ['recallStage','recallKind'].forEach(id=>$(id).addEventListener('change',recall));
    $('resultStage').addEventListener('change',chart);$('modelSize').addEventListener('change',model);
    ['visualInput','visualThreshold'].forEach(id=>$(id).addEventListener('change',visual));
    $('regressionMethod').innerHTML=ids.map((id,i)=>`<option value="${id}" ${i===5?'selected':''}>${methods[i].title}</option>`).join('');
    $('regressionMethod').addEventListener('change',regression);
    new MutationObserver(methodDetail).observe($('methodTitle'),{childList:true});
    new MutationObserver(workedExample).observe($('stepCurrent'),{childList:true});
    $('stressResult').innerHTML=metrics([['写入前命中','0 / 60'],['写入后命中','360 / 360'],['近邻拒绝','90 / 90'],['冲突覆盖','30 / 30']]);
    $('benchmarkTable').innerHTML=table(['模型','基准','题数','写入前','写入后','输出变化'],evidence.benchmarks.map(r=>[r.model,r.benchmark,r.samples,r.samples?pct(r.before_accuracy):'未测',r.samples?pct(r.after_accuracy):'未测',r.samples?pct(r.output_change_rate):'未测']));
    $('sourceList').innerHTML=evidence.sources.map(s=>`<li><a href="${esc(s.file)}">${esc(s.run)} / results.json</a></li>`).join('');
    recall();chart();model();visual();regression();methodDetail();
  });
})();
