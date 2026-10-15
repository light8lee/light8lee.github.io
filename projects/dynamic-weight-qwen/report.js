/* Paper companion: pedagogical computations and recorded experiment playback. */
(() => {
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct = v => `${(v*100).toFixed(1).replace('.0','')}%`;
  const num = v => Number(v.toFixed(4)).toString();
  const ids=['residual_hebbian','residual_oja','vocab_hebbian','vocab_hebbian_balanced','vocab_delta','vocab_ema','kv_replay','token_knn'];
  const stems=['01-residual-hebbian','02-residual-oja','03-vocab-hebbian','04-vocab-hebbian-balanced','05-vocab-delta','06-vocab-ema','07-kv-replay','08-token-knn'];
  const methodText = [
    ['加强共同活动的连接','在选定 Decoder 层，从归一化并投影的 hidden 求平均得到低秩活动 p，采集输出活动 s，以外积更新快权重。下次查询得到 code z，读出一个方向并加回 hidden。','经常一起活跃的方向形成更强连接。但更新只知道相关性，不知道通行码对应哪些 token；矩阵改变不保证新事实可解码。','四个连接如何被写入',0],
    ['给连接增长加上抑制','Oja 保留相同读取路径。在相关性加强之外，减去与当前连接强度和输出活动平方相关的项，控制连接增长。','输出越活跃、连接越强，抑制越明显。它改善数值稳定性，却没有增加答案目标，所以仍未可靠写入新事实。','0.4 为什么变成 0.4456？',2],
    ['把正确 token 纳入写入','teacher mask 选出 assistant 答案位置，把答案 token 之前的 hidden code k 与真正的下一 token y 对齐。插件矩阵每一列对应一个词表 token。','教师下一 token 为“苍”，就在“苍”列写入 key。下次查询相似时该列加分；但所有事实共用词表列，数字、标点与公共句式反复累积，造成串扰。','为什么“苍”得到加分？',0],
    ['削弱高频 token 偏置','按 token 历史次数 c 降低本次写入量，读取前再归一化各词表列，避免写得多的列天然占优。','平衡频率并没有恢复事实身份。“同一个 token 属于哪个装置”依然没有独立记录；30 条实验最终只有 2/60 个问题命中。','历史计数如何改变写入量',2],
    ['只修正尚未解释的误差','先衰减快权重，再比较它的预测与教师 one-hot 目标，用局部误差直接修正插件。n 是参与更新的答案位置数，误差不穿过冻结主干。','可提高正确 token、压低错误 token，但各 key 仍共享有限秩空间。修正一条事实可能影响邻近事实，局部纠错不能保证全部记忆正确。','两个候选 token 怎样被纠正',2],
    ['每个 token 保存平均上下文','把本次目标为同一 token 的 key 求均值，归一化并设置尺度，再与该 token 的旧原型做移动平均。查询与原型点积形成额外 logit。','动量越大，旧方向保留越多。但实体、位置与版本会平均到一起，压缩存储也压缩掉了事实归属；共享偏置还可能改变普通问题。','两条上下文如何被平均',0],
    ['给每条事实一个独立槽位','答案首 token 前的 hidden 作整条问答的 key，完整答案 token 序列作 value。首步选中并锁定槽位，之后按位置给对应 token 加偏置。','独立 value 保护答案顺序，连续首地址却容易混淆对象。选错槽位后也会流畅回放错误答案：30 条实验召回 90%，未学习近邻全部误触发。','首步选槽，后续怎样跟随',0],
    ['身份、轨迹与拒绝共同约束','保存每个答案位置的 key、目标 token、group、step，并给首地址附上实体、稀有 token 指纹与可选视觉签名。首步先过滤候选再比语义相似，后续只在同组当前 step 内投票。','实体解决“找谁”，hidden 处理“怎么问”，group / step 维持答案顺序。没有候选时基础 logits 原样返回；冲突覆盖也必须检查身份和上下文，避免误删相似实体。','同一对象换问法，与换对象有何不同',0]
  ];
  const stats=(i,s)=>i===7?evidence.models['0.6B'][`stage_${s}`]:i===6?evidence.kv[`stage_${s}`]:evidence.initial[ids[i]][`stage_${s}`];
  const table=(heads,rows)=>`<table><thead><tr>${heads.map(v=>`<th scope="col">${esc(v)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const tiles=rows=>`<div class="lab-stats">${rows.map(([title,value])=>`<div><b>${esc(value)}</b><span>${esc(title)}</span></div>`).join('')}</div>`;
  const select=(id,title,options,value)=>`<label>${esc(title)}<select id="${id}">${options.map(([v,text])=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
  const note=text=>`<p class="lab-footnote">${text}</p>`;
  const badge=text=>`<span class="demo-kind">${text}</span>`;
  const stageNames=['观察问答','读取旧态','写入变化','下次查询','影响输出'];
  const cycleStories=[
    '把“霁舟-17 的口令是苍羽-92”作为教师问答展示给冻结 Qwen。只有问题时无法知道新口令，因此写入必须带教师答案。',
    '插件读取当前记忆 Sₜ；基础模型参数保持原值。新知识能跨调用保留的通道是插件状态。',
    '观察模式开启局部写入。得到新记忆 Sₜ₊₁ 后，关闭写入并清除教师信号；普通生成不会自动写入。',
    '下一次只有问题“进入霁舟-17要什么口令？”。Qwen 产生查询 hidden，插件读取 Sₜ₊₁，而不是再次拿到教师答案。',
    '读取结果改变 hidden 或指定 token 的 logit。保存并加载 Sₜ₊₁，才能在另一个 session 再次使用这条记忆。'
  ];
  let active=null,step=0,timer=null,trigger=null,mathQueue=Promise.resolve();
  const options={eta:.1,query:'same',version:'old',recallStage:'3',recallKind:'exact',stage:'3',model:'0.6B',visual:'unseen_image_000',threshold:'0.995',regression:'vocab_ema',seed:'17',test:'exact'};

  function typeset(nodes) {
    mathQueue=mathQueue.catch(()=>{}).then(async()=>{
      if(!window.MathJax?.typesetPromise) return;
      await window.MathJax.startup.promise;
      const live=nodes.filter(n=>n.isConnected);if(!live.length)return;
      await window.MathJax.typesetPromise(live);
    });
  }
  function clearMath() {if(window.MathJax?.typesetClear)window.MathJax.typesetClear([$ ('labBody')]);}
  function stop(){if(timer)clearInterval(timer);timer=null;const b=$('demoPlay');if(b){b.textContent='自动播放';b.setAttribute('aria-pressed','false');}}
  function open(button) {
    stop();trigger=button;active={kind:button.dataset.demo,method:Number(button.dataset.method??7),source:button.dataset.source};step=Number(button.dataset.start??0);
    if(active.kind==='method'){options.eta=.1;options.query='same';options.version='old';}
    document.querySelectorAll('[data-demo]').forEach(b=>{b.classList.toggle('is-selected',b===button);b.setAttribute('aria-expanded',String(b===button));});
    $('labSource').textContent=active.source+' · 对应示例';$('labPanel').classList.add('is-open');$('reopenLab').hidden=true;
    mobileState();render();$('labBody').scrollTop=0;
  }
  function mobileState(){const mobile=matchMedia('(max-width:1280px)').matches;const panel=$('labPanel');if(mobile&&panel.classList.contains('is-open')){panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');document.body.classList.add('lab-backdrop');document.body.style.overflow='hidden';$('closeLab').focus({preventScroll:true});}else{panel.removeAttribute('role');panel.removeAttribute('aria-modal');document.body.classList.remove('lab-backdrop');document.body.style.overflow='';}}
  function close(){stop();$('labPanel').classList.remove('is-open');document.body.classList.remove('lab-backdrop');document.body.style.overflow='';$('labPanel').removeAttribute('aria-modal');$('labPanel').removeAttribute('role');if(matchMedia('(max-width:1280px)').matches)$('reopenLab').hidden=!active;else{clearMath();$('labTitle').textContent='交互示例';$('labBody').innerHTML='<div class="lab-empty"><h3>继续阅读左侧正文。</h3><p>点击任一“展开示例”按钮，即可打开对应环节。</p></div>';}document.querySelectorAll('[data-demo]').forEach(b=>b.setAttribute('aria-expanded','false'));trigger?.focus({preventScroll:true});}
  function controls(){return `<div class="stage-buttons" aria-label="实验流程步骤">${stageNames.map((n,i)=>`<button type="button" data-step="${i}" class="${i===step?'is-current':''}" aria-pressed="${i===step}">${i+1}<br>${n}</button>`).join('')}</div><div class="demo-controls"><button type="button" data-action="prev" ${step===0?'disabled':''}>← 上一步</button><button type="button" id="demoPlay" class="play" data-action="play" aria-pressed="${Boolean(timer)}">${timer?'暂停':'自动播放'}</button><button type="button" data-action="next" ${step===4?'disabled':''}>下一步 →</button><button type="button" data-action="reset">重置</button><span class="demo-counter">${step+1} / 5</span></div>`;}
  function slider(){const i=active.method;return `<label>${i===5?'新信息占比 1−m':'写入步长 η'} = <output id="etaOut" class="range-output">${num(options.eta)}</output><input id="etaSlider" type="range" min="0.01" max="0.5" step="0.01" value="${options.eta}" aria-label="${i===5?'新信息占比':'写入步长'}"></label>`;}
  function numericState(i) {
    const a=options.eta,changed=step>=2;let values=[],work='',label='';
    if(i===0){values=[.6*a,.2*a,.3*a,.1*a].map(v=>changed?v:0);label='两维快权重 W';work=`p = [1, 0.5]，s = [0.6, 0.2]\nΔW = ${num(a)} × psᵀ（无衰减）\n查询 [1,0] 读出 [${num(values[0])}, ${num(values[1])}]`;
    }else if(i===1){values=[changed?.4+a*(.6-.4*.36):.4];label='取一条连接观察 Oja';work=`p=1，s=0.6，w旧=0.4\n加强 = 0.6，抑制 = 0.4×0.6² = 0.144\nOja 新值 = ${num(.4+a*.456)}\nHebbian 新值 = ${num(.4+a*.6)}（无衰减）`;
    }else if(i===2||i===3){const scale=i===3?.5:1;values=[changed?.8*a*scale:0,changed?.6*a*scale:0];label='“苍”列的本次写入增量';work=`归一化 key = [0.8,0.6]\n${i===3?'历史次数 3 → 缩放 1/√4=0.5\n':''}Δ“苍”列 = [${num(.8*a*scale)}, ${num(.6*a*scale)}]\n${i===3?'读取时另做列归一化，不能把增量减半当成最终 logit 减半。':`相同查询动态加分 = ${num(changed?a:0)}\n这是 logit 分数，不是概率。`}`;
    }else if(i===4){values=changed?[.2+.8*a,.3-.3*a]:[.2,.3];label='插件候选分数：苍 / 云';work=`key=[1,0]，教师=[1,0]\n旧预测=[0.2,0.3]，误差=[0.8,−0.3]\n新预测=[${num(.2+.8*a)},${num(.3-.3*a)}]\n单样本，忽略衰减，未乘注入强度。`;
    }else if(i===5){values=changed?[1-a,a]:[1,0];label='“苍”的上下文原型';work=`旧方向=[1,0]，新方向=[0,1]\n新信息占比=${num(a)}，m=${num(1-a)}\n新原型=[${num(1-a)},${num(a)}]\n同 token 的事实被混合；尺度与奖励均取 1。`;}
    return `<div class="state-figure"><h3>${label}</h3><div class="state-matrix">${values.map(v=>`<div class="state-cell ${changed?'written':''}">${num(v)}</div>`).join('')}</div><pre class="numeric-work">${esc(work)}</pre></div>`;
  }
  function tokenState(i) {
    const rejected=i===7&&options.query==='near',newValue=options.version==='new';
    const tokens=newValue?['紫','杉','-','117']:['苍','羽','-','92'];
    const status=step<2?'尚未写入':step<3?'轨迹已保存':rejected?'门控拒绝，基础 logits 原样返回':i===6&&options.query==='near'?'可能错选槽位（教学碰撞情形）':'锁定同一事实，按位置回放';
    return `<div class="state-figure"><h3>${i===6?'独立 KV 槽位':'group 13 的 token 轨迹'} · ${status}</h3><div class="lab-flow">${tokens.map((t,j)=>`${j?'<span class="lab-arrow">→</span>':''}<div class="lab-node ${step>=2&&!rejected?'active':''}"><small>step ${j}</small>${t}</div>`).join('')}</div>${step>=3?`<ul class="gate-list"><li>查询对象<span>${options.query==='near'?'霁舟-99':'霁舟-17'}</span></li><li>身份门控<span class="${rejected?'gate-fail':'gate-pass'}">${i===6?'此方法未设实体门控':rejected?'不匹配 → 拒绝':'同一实体 → 通过'}</span></li></ul>`:''}</div>`;
  }
  function methodDemo() {
    const i=active.method,m=methods[i];$('labTitle').textContent=m.title+' · 写入与读取';
    return badge('教学计算 · 数值与 token 切分为示意')+`<div class="case-card"><b>观察：霁舟-17 的通行码是“苍羽-92”</b><p>下次只问：“进入霁舟-17要什么口令？”</p></div>`+controls()+`<p class="demo-description" id="demoStory">${methodStory(i)}</p>`+(i<6?slider():select('queryCase','换个查询，观察读取边界',[['same','同一实体，换个问法'],['near','未教过的霁舟-99']],options.query))+`<div id="demoState">${i<6?numericState(i):tokenState(i)}</div><div class="local-symbols"><b>本方法变量</b><p>${readingGuide.data[i].symbols}</p></div><div class="formula-live" id="liveFormula">${esc(m.formulas[step][1])}</div><p class="demo-copy">${m.formulas[step][2]}</p>`+note(i<6?'拖动滑块重算低维局部更新；省略其他位置、衰减与裁剪，不代表本机实验测量。':'轨迹编号与 token 切分为教学简化，碰撞情形只展示风险；真实结果见正文第 5 节。')+`<details class="demo-details"><summary>查看对应架构图</summary>${readingGuide.diagram(i)}<p class="lab-footnote">蓝色实线为原生结构，橙色虚线为新增插件。向下阅读本方法的接入路径。</p></details>`;
  }
  function methodStory(i){
    const a=options.eta;
    if(i===0&&step===2)return `令 p=(1,0.5)、s=(0.6,0.2)，步长 ${num(a)}，不计衰减。外积写入四个连接：${[.6,.2,.3,.1].map(v=>num(v*a)).join('、')}。记录的是共同活动，没有记录哪个 token 才是答案。`;
    if(i===0&&step===3)return `改问同一装置的口令，假设查询 code 为 (1,0)。乘更新后的矩阵，读出方向 (${num(.6*a)},${num(.2*a)})，随后加回 hidden。`;
    if(i===1&&step===2)return `p=1、s=0.6、旧连接0.4。正向加强0.6，抑制0.4×0.6²=0.144。步长${num(a)}时，增量是${num(a*.456)}，新连接为${num(.4+a*.456)}。`;
    if(i===1&&step===3)return `新问题仍沿相同侧路读取。Oja连接为${num(.4+a*.456)}，同一步长的Hebbian为${num(.4+a*.6)}；抑制缩小了更新，但没有提供正确答案目标。`;
    if(i===2&&step===2)return `归一化key=(0.8,0.6)，步长${num(a)}，旧列为0。教师目标是“苍”，就只向该列写入(${num(.8*a)},${num(.6*a)})；“云”列保持不变。`;
    if(i===2&&step>=3)return `相同查询与新“苍”列点乘，得到${num(a)}分，再乘注入强度加入基础logit。其他含“苍”的事实也会写入这一列，因此目标明确仍不保证身份可区分。`;
    if(i===4&&step===2)return `误差=(1,0)−(0.2,0.3)=(0.8,−0.3)。步长${num(a)}时，“苍”加${num(.8*a)}，“云”减${num(.3*a)}。这是单样本局部更新，忽略衰减。`;
    if(i===4&&step===3)return `再次输入key=(1,0)，预测从(0.2,0.3)变成(${num(.2+.8*a)},${num(.3-.3*a)})。没有梯度穿过Qwen主干，变化发生在共享插件矩阵。`;
    if(i===5&&step===2)return `新信息占比${num(a)}，动量m=${num(1-a)}，目标尺度与奖励均为1。旧原型(1,0)与新方向(0,1)混合后，得到(${num(1-a)},${num(a)})。两条上下文仍只留下一个原型。`;
    if(i===5&&step===3)return `旧查询(1,0)读出的分数是${num(1-a)}，新查询(0,1)读出的分数是${num(a)}。改变动量只是在两者之间分配权重，没有生成独立事实槽位。`;
    return methodExamples[i].steps[step];
  }
  function cycleDemo(){ $('labTitle').textContent='Session A 写入 → Session B 生成';return badge('教学流程 · 冻结主干与可写记忆')+controls()+`<p class="demo-description">${cycleStories[step]}</p><div class="state-figure"><div class="lab-flow"><div class="lab-node ${step===0?'active':''}"><small>Session A · 数据输入</small>user 问题 + assistant 教师答案</div><span class="lab-arrow">→</span><div class="lab-node"><small>不更新参数</small>冻结 Qwen</div></div><div class="lab-flow"><span class="lab-arrow">↓</span><div class="lab-node ${step>=2?'active':''}"><small>可更新并保存</small>${step<2?'旧记忆 Sₜ':'新记忆 Sₜ₊₁'}</div></div><div class="lab-flow"><div class="lab-node ${step>=3?'active':''}"><small>Session B · 唯一输入</small>user 新问题</div><span class="lab-arrow">→</span><div class="lab-node ${step===4?'active':''}"><small>Session B · 模型生成 assistant</small>${step===4?'苍羽-92':'等待读取'}</div></div></div>`+note('主干前向生成 hidden；只有观察模式修改记忆。普通生成默认只读，跨 session 使用依赖显式保存与加载。');}
  function recallDemo(){ $('labTitle').textContent='通行码 · 真实问答回放';const s=Number(options.recallStage),k=options.recallKind;
    const r=evidence.recallRows.find(r=>r.stage===s&&r.kind===k&&r.fact_id===(k==='near_control'?'near_control_1':k==='generic_control'?'generic_control_1':'code_01'));
    return badge('实测回放 · Qwen3-0.6B / 最终 token kNN')+select('recallStage','记忆阶段',[['1','第一阶段：10 条 / 苍羽-17'],['2','第二阶段：20 条 / 苍羽-17'],['3','第三阶段：30 条 / 覆盖为紫杉-117']],s)+select('recallKind','怎样提问',[['exact','原问法：霁舟-2'],['paraphrase','同一实体换问法'],['near_control','未教过的霁舟-99'],['generic_control','通用问题：法国首都']],k)+`<div class="case-card"><b>实际问题</b><p>${esc(r.question)}</p></div><p class="output-label">${r.retrieval_slot===-1?'未选中记忆槽位，由基础模型回答':'命中记忆轨迹'}</p><div class="record-output ${r.retrieval_slot===-1?'reject':''}">${esc(r.answer)}</div>`+tiles([['记录判定',r.success?'通过':'未通过'],['检索相似度',r.retrieval_slot===-1?'未命中':num(r.retrieval_similarity)]])+note((r.expected?`期望值 ${esc(r.expected)}。`:'控制题检查没有污染已知事实。')+`原始生成用时 ${r.latency_s.toFixed(3)} s，单条记录不作为性能基准。`)+note('这里切换实验保存的回答，不在网页中运行模型。拒绝指插件不注入答案，基础模型仍可正常回答。');
  }
  function gateDemo(){ $('labTitle').textContent='门控与安全覆盖';const near=options.query==='near',over=options.version==='new';return badge('教学操作 · 身份与更新边界')+`<div class="case-card"><b>两个相似对象，两个独立 group</b><p>霁舟-17 → ${over?'紫杉-117':'苍羽-92'}<br>霁舟-18 → 青梧-08</p></div>`+select('queryCase','查询身份',[['same','霁舟-17，换一种问法'],['near','未学过的霁舟-99']],options.query)+`<ul class="gate-list"><li>实体 / 稀有 token 指纹<span class="${near?'gate-fail':'gate-pass'}">${near?'不匹配':'通过'}</span></li><li>语义 hidden 地址<span class="${near?'gate-wait':'gate-pass'}">${near?'无需继续检索':'允许同义改写'}</span></li><li>group / step<span>${near?'不选择轨迹':'只跟随霁舟-17'}</span></li></ul><div class="record-output ${near?'reject':''}">${near?'插件拒绝注入，交还基础模型':over?'紫杉-117':'苍羽-92'}</div><button class="small-action" type="button" data-action="overwrite">${over?'恢复教学初始值':'将霁舟-17覆盖为紫杉-117'}</button>`+note('点覆盖后，霁舟-18保持“青梧-08”。更新依据身份与上下文，不把两个相似 hidden 自动视为同一事实。此处为规则教学，真实覆盖结果可点击第 1 节按钮回放。');}
  function retentionDemo(){ $('labTitle').textContent='容量增加时，哪些指标变化？';const s=Number(options.stage);return badge('实测汇总 · 版本口径与正文一致')+select('resultStage','写入阶段',[['1','10 条事实 / 20 问'],['2','20 条事实 / 40 问'],['3','30 条 / 60 问 + 冲突覆盖']],s)+note('蓝条：事实召回；绿条：未学习近邻通过拒绝测试。两者均越高越好。')+ids.map((id,i)=>{const m=stats(i,s);return `<div class="plot-row"><div class="plot-name"><b>${methods[i].title}</b><span>${pct(m.overall_rate)} / ${pct(m.near_control_clean_rate)}</span></div><div class="plot-rail"><i style="width:${m.overall_rate*100}%"></i></div><div class="plot-rail green" style="margin-top:4px"><i style="width:${m.near_control_clean_rate*100}%"></i></div></div>`;}).join('')+note('原始 token kNN 本阶段召回 '+pct(evidence.initial.token_knn[`stage_${s}`].overall_rate)+'；上方是最终实体门控版本。第一阶段没有旧批次，不能把“保持 100%”当作有效保持证据。');}
  function modelDemo(){ $('labTitle').textContent='跨模型尺寸的结果';const m=evidence.models[options.model].stage_3;return badge('实测汇总 · 同一 30 条 / 60 问')+select('modelSize','Qwen3 模型',[['0.6B','0.6B'],['1.7B','1.7B'],['4B-FP8','4B-FP8']],options.model)+tiles([['总体召回',pct(m.overall_rate)],['旧事实保持',pct(m.old_retention_rate)],['覆盖成功',pct(m.overwrite_success_rate)],['近邻拒绝',pct(m.near_control_clean_rate)]])+`<div class="case-card"><b>第三阶段记忆文件</b><p>约 ${{'0.6B':'2.68','1.7B':'4.51','4B-FP8':'5.43'}[options.model]} MB。更大模型的地址向量更宽，保存相同事实也需要更多空间。</p></div>`+note('本组均达到 100%，不说明更大的模型在更难任务上没有收益。模型文件与外部记忆文件是不同开销。');}
  function visualDemo(){ $('labTitle').textContent='同一张图，改变读取门限';const unseen=options.visual.startsWith('unseen'),cal=options.threshold==='0.999';const rows=cal?evidence.calibratedRows:evidence.visualRows;const r=rows.find(r=>r.id===options.visual&&r.kind===(unseen?'unseen_image':'heldout_paraphrase'));
    return badge('实测回放 · Qwen3-VL-2B')+select('visualInput','图片输入',[['unseen_image_000','未学过的图片：控制样本'],['visual_000','已学习：蓝色圆形'],['visual_001','已学习：红色方形'],['visual_002','已学习：绿色三角形']],options.visual)+select('visualThreshold','已实际测过的门限',[['0.995','初始 0.995'],['0.999','校准 0.999']],options.threshold)+`<img class="mini-image" src="images/${unseen?'unseen-000':`memory-${options.visual.split('_')[1]}`}.png" alt="${unseen?'未学习的控制图片':'已学习的视觉卡片'}"><p class="demo-copy">问题：${unseen?'这张卡片分配的密钥是什么？只回答密钥。':'图中卡片对应哪个保密码？只回答密码。'}</p><ul class="gate-list"><li>图片签名相似度<span>${r.context_similarity.toFixed(6)}</span></li><li>当前图片门限<span>${options.threshold}</span></li></ul><p class="output-label">保存的真实回答 · ${r.success?'通过':'误触发已存密钥'}</p><div class="record-output ${!r.success?'fail':unseen?'reject':''}">${esc(r.answer)}</div>`+tiles([['48 图精确召回','100%'],['24 未见图通过控制',cal?'24 / 24':'18 / 24']])+note('未见图通过控制仅表示没有输出已存密钥，例如“U-1000”并不是学到了新密钥。此图用于门限校准，不代表独立自然图片泛化。');}
  function regressionDemo(){ $('labTitle').textContent='同一道题，写入前后发生了什么？';const id=options.regression,m=evidence.probe[id],r=evidence.probeExamples[id];return badge('实测回放 · 同一组 20 题 MMLU')+select('regressionMethod','记忆方法',ids.map((id,i)=>[id,methods[i].title]),id)+tiles([['写入前准确率',pct(m.before_accuracy)],['写入后准确率',pct(m.after_accuracy)],['输出变化率',pct(m.output_change_rate)],['正确→错误',String(m.regression_count)+' 题']])+note(`记录 ${esc(r.id)}，期望选项 ${esc(r.expected)}。下面保留原始生成长度。`)+`<p class="output-label">写入前</p><pre class="numeric-work record-output">${esc(r.before_output)}</pre><p class="output-label">写入后</p><pre class="numeric-work record-output ${r.regressed?'fail':''}">${esc(r.after_output)}</pre>`+note('准确率不变可能伴随输出改变。残差方法零退化也不等于记住了新事实，必须结合第 5.1 节召回结果判断。');}
  function stressDemo(){ $('labTitle').textContent='排除猜测与检索过宽';const source=evidence.sources.find(s=>s.run==='random-stress-3x60-v3');const seed=options.seed;return badge('实测汇总 · 三个独立随机实验')+select('stressSeed','独立实验种子',[['17','种子 17 / 60 条'],['29','种子 29 / 60 条'],['43','种子 43 / 60 条']],seed)+select('stressTest','查看控制环节',[['pre','写入前探针'],['exact','写入后：精确 / 未见改写'],['negative','从未写入的相似对象'],['overwrite','覆盖冲突值']],options.test)+`<div class="case-card"><b>${{pre:'还没有把密钥教给模型',exact:'写入、保存、换 session，再询问',negative:'结构相似，但身份没有被教过',overwrite:'同一实体写入新密钥'}[options.test]}</b><p>${{pre:'随机密钥无法从常识推断。每个种子先测 20 条，均没有偶然命中。',exact:'每条用两种表达教学，再测精确问法和未见改写。每个种子共 120 问全部命中。',negative:'每个种子构造 30 个未学习近邻，全部没有泄漏已知答案，排除“问什么都回放旧值”。',overwrite:'每个种子更新最早 10 条事实，10/10覆盖成功，旧值泄漏为0。'}[options.test]}</p></div>`+tiles([['本种子事实','60 条'],['总体命中',pct(evidence.stressSeeds[seed].overall_rate)],['写入前偶然命中',pct(evidence.stressSeeds[seed].prewrite_accidental_rate)],['近邻控制通过',pct(evidence.stressSeeds[seed].near_negative_clean_rate)]])+`<a href="${source.file}" target="_blank" rel="noopener">查看逐题原始 JSON ↗</a>`+note('三个种子合计 180 条、360 问；每个独立记忆库是60条，不是180条同时写入。');}
  function render(){if(!active)return;const body=$('labBody'),previousScroll=body.scrollTop,focused=document.activeElement;const focusId=body.contains(focused)?focused.id:'';const action=body.contains(focused)?focused.dataset.action:null;const focusStep=body.contains(focused)?focused.dataset.step:null;clearMath();const map={cycle:cycleDemo,method:methodDemo,recall:recallDemo,gate:gateDemo,retention:retentionDemo,model:modelDemo,visual:visualDemo,regression:regressionDemo,stress:stressDemo};body.innerHTML=map[active.kind]();body.scrollTop=previousScroll;const next=focusId?$(focusId):action?body.querySelector(`[data-action="${action}"]:not(:disabled)`):focusStep!==undefined?body.querySelector(`[data-step="${focusStep}"]`):null;next?.focus({preventScroll:true});typeset([body]);}
  function setStep(value){step=Math.max(0,Math.min(4,value));if(step===4)stop();render();}
  function play(){if(timer){stop();return;}if(step===4)step=0;timer=setInterval(()=>{if(step>=4){stop();return;}step++;if(step===4)stop();render();},1800);render();}

  document.addEventListener('DOMContentLoaded',()=>{
    $('paperMethods').innerHTML=methodText.map((t,i)=>`<section class="method-section" id="method-${i}"><h3>3.${i+1} ${methods[i].title}：${t[0]}</h3><p>${t[1]}</p>${readingGuide.formulas(i)}<p><strong>机制与边界：</strong>${t[2]}</p><button type="button" class="example-button" data-demo="method" data-method="${i}" data-start="${t[4]}" data-source="3.${i+1} · ${methods[i].title}">展开：${t[3]} <span>↗</span></button>${i===7?'<button type="button" class="example-button" data-demo="gate" data-source="3.8 · 安全覆盖">展开：更新霁舟-17，怎样保护霁舟-18 <span>↗</span></button>':''}</section>`).join('');
    $('mechanismComparison').innerHTML='<table><caption>表 A · 同一组比较维度</caption><thead><tr>'+['方法 / 接入点','持久状态','写入目标','更新规则','怎样读取','隔离与拒绝','主要边界'].map(v=>`<th scope="col">${v}</th>`).join('')+'</tr></thead><tbody>'+readingGuide.data.map((d,i)=>`<tr><th scope="row"><a href="#method-${i}">${methods[i].title}</a><small>${i<2?'Decoder 层输出':'LM Head 输出'}</small></th>${[d.state,d.target,d.write,d.read,d.isolation,d.risk].map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')+'</tbody></table>';
    $('paperMethodResults').innerHTML=table(['方法','召回','近邻拒绝','覆盖'],ids.map((id,i)=>{const r=stats(i,3);return [methods[i].title,pct(r.overall_rate),pct(r.near_control_clean_rate),pct(r.overwrite_success_rate)];}));
    $('paperBenchmarks').innerHTML=table(['模型','基准','题数','前 / 后','输出变化'],evidence.benchmarks.map(r=>[r.model,r.benchmark,r.samples,r.samples?`${pct(r.before_accuracy)} / ${pct(r.after_accuracy)}`:'未测',r.samples?pct(r.output_change_rate):'未测']));
    $('paperSources').innerHTML=evidence.sources.map(s=>`<li><a href="${s.file}">${esc(s.run)} / results.json</a></li>`).join('');
    document.querySelectorAll('[data-demo]').forEach(b=>{b.setAttribute('aria-controls','labPanel');b.setAttribute('aria-expanded','false');});
    document.addEventListener('click',event=>{const b=event.target.closest('[data-demo]');if(b)open(b);});
    $('labBody').addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.step!==undefined){stop();setStep(Number(b.dataset.step));return;}if(b.dataset.action==='prev'){stop();setStep(step-1);}if(b.dataset.action==='next'){stop();setStep(step+1);}if(b.dataset.action==='reset'){stop();setStep(0);}if(b.dataset.action==='play')play();if(b.dataset.action==='overwrite'){options.version=options.version==='new'?'old':'new';render();}});
    $('labBody').addEventListener('input',event=>{if(event.target.id==='etaSlider'){options.eta=Number(event.target.value);$('etaOut').textContent=num(options.eta);$('demoState').innerHTML=numericState(active.method);$('demoStory').textContent=methodStory(active.method);}});
    const bindings={queryCase:'query',recallStage:'recallStage',recallKind:'recallKind',resultStage:'stage',modelSize:'model',visualInput:'visual',visualThreshold:'threshold',regressionMethod:'regression',stressSeed:'seed',stressTest:'test'};
    $('labBody').addEventListener('change',event=>{if(bindings[event.target.id]){options[bindings[event.target.id]]=event.target.value;render();const replaced=$(event.target.id);replaced?.focus({preventScroll:true});}});
    $('closeLab').addEventListener('click',close);$('reopenLab').addEventListener('click',()=>{if(active){$('labPanel').classList.add('is-open');$('reopenLab').hidden=true;trigger?.setAttribute('aria-expanded','true');mobileState();render();}});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('labPanel').classList.contains('is-open')){close();return;}if(event.key==='Tab'&&$('labPanel').getAttribute('aria-modal')==='true'){const focusable=[...$('labPanel').querySelectorAll('button:not(:disabled),select,input,a[href],summary')].filter(el=>el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}});
    matchMedia('(max-width:1280px)').addEventListener('change',()=>{mobileState();if(active)$('reopenLab').hidden=!matchMedia('(max-width:1280px)').matches||$('labPanel').classList.contains('is-open');});
    typeset([$ ('paper')]);window.addEventListener('load',()=>typeset([$ ('paper'),$ ('labBody')]));
  });
})();
