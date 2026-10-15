const methods = [
  {
    id: 'residual-hebbian', title: 'Residual Hebbian', hook: 'Decoder hook', state: '层内快权重', type: 'matrix',
    tagline: '共同激活就加强连接：把本次问答的低秩活动方向写入 Decoder 残差旁路。',
    boundary: '它能重新激活相似隐藏方向，却不知道答案应该是哪一个 token。权重变化不等于事实可解码。',
    gap: '缺少目标 token', effect: '隐藏残差偏移', boost: 8,
    formulas: [
      ['形成局部活动', String.raw`\[Z=\operatorname{norm}\!\left(\tanh(NE)\right)\]`, '冻结层输出先经过 RMS 归一化和固定低秩投影，得到当前问答的局部 code。'],
      ['更新前状态', String.raw`\[S_t=\left\{W_t^{\mathrm{fast}},\tau_t\right\}\]`, '真正持续变化的是每个选中层的快权重和活动 trace，Qwen 主干不变。'],
      ['Hebbian 写入', String.raw`\[W_{t+1}^{\mathrm{fast}}=(1-\lambda)W_t^{\mathrm{fast}}+\gamma ps^{\top}\]`, '外积把同时出现的 pre/post 活动建立连接；整步在 no_grad 中原位完成。'],
      ['下一次读取', String.raw`\[d_q=z_qW_{t+1}^{\mathrm{fast}}\]`, '相似问题产生查询 code，并从刚更新的层内矩阵读出记忆方向。'],
      ['注入隐藏流', String.raw`\[h_q^{\prime}=h_q+\alpha d_q\]`, '读取结果在 Decoder 层输出处作为残差注入，后续层和 LM Head 因此看到不同 hidden。']
    ]
  },
  {
    id: 'residual-oja', title: 'Residual Oja', hook: 'Decoder hook', state: '稳定化快权重', type: 'matrix',
    tagline: '在 Hebbian 正相关写入上加入活动依赖抑制，限制强连接继续膨胀。',
    boundary: 'Oja 修复数值稳定性，没有增加监督信息；它依然不知道哪个 token 才是正确答案。',
    gap: '稳定但仍无目标', effect: '受控隐藏偏移', boost: 7,
    formulas: [
      ['形成局部活动', String.raw`\[p=\operatorname{mean}(Z),\qquad s=\tanh(\operatorname{mean}(N))\]`, '从同一次冻结前向取得突触前和突触后活动统计。'],
      ['更新前状态', String.raw`\[S_t=\left\{W_t^{\mathrm{oja}},\tau_t\right\}\]`, 'Oja 与 Hebbian 共享同一读取路径，只替换写入规则。'],
      ['Oja 写入', String.raw`\[W_{t+1}=(1-\lambda)W_t+\gamma\!\left(ps^{\top}-W_t\operatorname{diag}(s^2)\right)\]`, '第一项加强相关连接，第二项抑制已经过强的输出维度。'],
      ['下一次读取', String.raw`\[d_q=z_qW_{t+1}\]`, '查询仍然只按 hidden code 从更新后矩阵读取。'],
      ['注入隐藏流', String.raw`\[h_q^{\prime}=h_q+\alpha d_q\]`, 'Oja 影响下一次推理的方式与 Hebbian 完全相同，只是状态更稳定。']
    ]
  },
  {
    id: 'vocab-hebbian', title: 'Vocab Hebbian', hook: 'LM Head hook', state: 'key→词表矩阵', type: 'vocab',
    tagline: '第一次把教师 next token 纳入写入：相似 key 会直接抬高目标 token 的 logit。',
    boundary: '所有事实共享同一个词表矩阵；破折号、数字和常见句式会反复写入相同列并形成串扰。',
    gap: '共享词表列串扰', effect: '目标 token logit', boost: 18,
    formulas: [
      ['教师对齐', String.raw`\[(k_i,y_i),\qquad i\in\mathcal A\]`, 'teacher mask 只选择 assistant 答案位置，把每个上下文 key 对齐到真实 next token。'],
      ['更新前状态', String.raw`\[W_t\in\mathbb R^{r\times V}\]`, '每一列对应一个词表 token，所有事实共用这一个低秩映射。'],
      ['写入目标列', String.raw`\[W_{t+1}=(1-\lambda)W_t+\eta\sum_i k_i e_{y_i}^{\top}\]`, '每个 key 只写入真实 token 对应的列，因此终于有了明确语言目标。'],
      ['下一次读取', String.raw`\[\ell_{\mathrm{dyn}}=k_qW_{t+1}\]`, '新问题的 key 与历史 key 越相似，对应目标列得到的分数越大。'],
      ['合并 logits', String.raw`\[\ell^{\prime}=\ell_{\mathrm{base}}+\alpha\ell_{\mathrm{dyn}}\]`, '基础模型不被替换；插件只在 LM Head 输出后叠加动态分数。']
    ]
  },
  {
    id: 'balanced-hebbian', title: 'Balanced Hebbian', hook: 'LM Head hook', state: '矩阵 + token 计数', type: 'vocab',
    tagline: '降低高频 token 的写入幅度，并在读取前归一化每个词表列。',
    boundary: '它消除了“写得多所以总获胜”的尺度偏置，却仍无法区分相同 token 属于哪条事实。',
    gap: '有平衡、无事实身份', effect: '归一化动态 logits', boost: 16,
    formulas: [
      ['读取历史频次', String.raw`\[a_i=\frac{1}{\sqrt{c_t(y_i)+1}}\]`, '目标 token 写入次数越多，本次更新的缩放越小。'],
      ['更新前状态', String.raw`\[S_t=\{W_t,c_t\}\]`, '除共享矩阵外，还维护每个词表 token 的历史计数。'],
      ['平衡写入', String.raw`\[W_{t+1}=(1-\lambda)W_t+\eta\sum_i a_i k_i e_{y_i}^{\top}\]`, '逆频率缩放削弱高频符号、数字和公共句式的积累速度。'],
      ['归一化读取', String.raw`\[\widehat W_{:,y}=\frac{W_{:,y}}{\max(\lVert W_{:,y}\rVert_2,\varepsilon)}\]`, '读取前把每个 token 列拉回相同尺度。'],
      ['合并 logits', String.raw`\[\ell^{\prime}=\ell_{\mathrm{base}}+\alpha k_q\widehat W\]`, '下一次推理不再只因某一列范数大而选择高频 token。']
    ]
  },
  {
    id: 'vocab-delta', title: 'Vocab Delta', hook: 'LM Head hook', state: '误差修正矩阵', type: 'delta',
    tagline: '先计算当前快权重已经预测了什么，只把尚未解释的局部输出误差写回。',
    boundary: '局部误差更有方向，但所有映射仍被压进有限秩矩阵；修正一个 key 可能覆盖邻近 key。',
    gap: '有限秩覆盖冲突', effect: '相似度加权纠错', boost: 20,
    formulas: [
      ['形成局部误差', String.raw`\[E_t=Y-KW_t\]`, 'one-hot 教师目标减去快权重当前预测；误差只存在于插件输出端。'],
      ['更新前状态', String.raw`\[W_t\in\mathbb R^{r\times V}\]`, '冻结 Qwen 的 hidden 只是 key，主干不接收误差信号。'],
      ['Delta 写入', String.raw`\[W_{t+1}=(1-\lambda)W_t+\frac{\eta}{N}K^{\top}E_t\]`, '闭式局部更新直接改写快权重，不构建计算图。'],
      ['下一次读取', String.raw`\[\Delta\ell_q\propto k_qK^{\top}(Y-KW_t)\]`, '查询与教师 key 的相似度决定这次误差修正能传播多少。'],
      ['合并 logits', String.raw`\[\ell^{\prime}=\ell_{\mathrm{base}}+\alpha k_qW_{t+1}\]`, '被纠正后的低秩映射在下一次 LM Head 输出处参与决策。']
    ]
  },
  {
    id: 'vocab-ema', title: 'Vocab EMA', hook: 'LM Head hook', state: '每 token 一个原型', type: 'prototype',
    tagline: '不保存完整映射，而为每个 token 维护“通常在什么上下文出现”的移动平均原型。',
    boundary: '一个 token 只有一个原型，不同事实、答案位置和新旧版本会被平均成同一个方向。',
    gap: '平均掉身份与顺序', effect: '原型相似度 logits', boost: 10,
    formulas: [
      ['按 token 聚合', String.raw`\[\mu_y=\frac{1}{|\mathcal K_y|}\sum_{k_i\in\mathcal K_y}k_i\]`, '把本批所有目标为 token y 的 key 求平均。'],
      ['更新前状态', String.raw`\[S_t=\{p_{y,t}\}_{y=1}^{V}\]`, '每个词表 token 只有一个上下文原型。'],
      ['EMA 写入', String.raw`\[p_{y,t+1}=mp_{y,t}+(1-m)\widehat\mu_y\]`, '新上下文以动量方式融入旧原型，旧信息不会立即消失。'],
      ['下一次读取', String.raw`\[s_y(k_q)=k_q^{\top}p_{y,t+1}\]`, '查询越像某个 token 的历史平均上下文，该 token 得分越高。'],
      ['合并 logits', String.raw`\[\ell_y^{\prime}=\ell_{\mathrm{base},y}+\alpha s_y(k_q)\]`, '原型相似度在下一次推理中成为额外 token 分数。']
    ]
  },
  {
    id: 'kv-replay', title: 'KV Replay', hook: 'LM Head hook', state: '独立问答槽位', type: 'slots',
    tagline: '给每条问答一个独立槽位：首步找到地址，后续按顺序回放整段答案。',
    boundary: '独立 value 避免压缩冲突，但首地址只靠连续 hidden；一旦选错槽位，后续整段都会稳定回放错。',
    gap: '首地址容易误触发', effect: '锁槽后的 token 回放', boost: 50,
    formulas: [
      ['提取地址与答案', String.raw`\[k_i=\operatorname{norm}(h_{j_0-1}),\qquad v_i=(y_0,\ldots,y_{m-1})\]`, '答案首 token 前的 hidden 作为整条问答地址，完整答案序列作为 value。'],
      ['更新前状态', String.raw`\[S_t=\{(k_i,v_i,m_i)\}_{i=1}^{M}\]`, '每条事实拥有独立槽位，不再共享一个词表矩阵。'],
      ['追加或覆盖槽位', String.raw`\[S_{t+1}=S_t\cup\{(k_{\mathrm{new}},v_{\mathrm{new}})\}\]`, '高相似地址覆盖旧槽位，否则追加；容量满后按环形位置复用。'],
      ['首步检索', String.raw`\[i^*=\arg\max_i q_0^{\top}k_i\]`, '只在生成答案第一个 token 前选择一次槽位，然后锁定 active slot。'],
      ['逐步回放', String.raw`\[\ell_j^{\prime}(y)=\ell_j(y)+\beta\,\mathbf 1[y=v_{i^*}[j]]\]`, '每一步只给槽位中对应位置的 token 增加偏置。']
    ]
  },
  {
    id: 'token-knn', title: 'Token kNN', hook: 'LM Head hook', state: '带门控的逐 token 转移', type: 'transitions',
    tagline: '把答案拆成逐 token 轨迹：身份门控选事实，hidden 处理改写，group/step 保持连续。',
    boundary: '当前门控在合成实体和实例图片上有效；自然实体、强改写与自然图像仍需要更通用的身份表示。',
    gap: '门控泛化与容量成本', effect: '受门控的逐 token 偏置', boost: 56,
    formulas: [
      ['拆成转移轨迹', String.raw`\[\mathcal T_g=\{(k_j,y_j,g,j,e,c,\phi(x))\}_{j=0}^{m-1}\]`, '每个答案 token 都有自己的 key、group、step、实体标签和上下文签名。'],
      ['更新前状态', String.raw`\[S_t=\bigcup_g\mathcal T_g\]`, '记忆库保存独立轨迹，而不是把所有事实压进共享矩阵。'],
      ['安全覆盖并追加', String.raw`\[\operatorname{same}=G_{\mathrm{entity}}G_{\mathrm{context}}G_{\mathrm{cosine}}\]`, '只有身份、视觉上下文和 start hidden 同时匹配，旧 group 才能被覆盖。'],
      ['首步多门控检索', String.raw`\[i^*=\arg\max_{i\in\mathcal C_0}q_0^{\top}k_i\]`, '候选先通过实体、词法、视觉和起始位置门控，再比较语义相似度。'],
      ['组内逐步投票', String.raw`\[\ell_j^{\prime}(y)=\ell_j(y)+\beta\,\mathbf 1[y=y_j^*]\]`, '命中后只在同一 group 和 step 内 top-k 投票；失败则完全返回基础 logits。']
    ]
  }
];

const stepMeta = [
  { label: '第 t 次观察', mode: 'OBSERVE', color: '#1769aa' },
  { label: '读取旧状态', mode: 'STATE BEFORE', color: '#c97816' },
  { label: '局部规则写入', mode: 'NO BACKPROP', color: '#c84b3c' },
  { label: '第 t+1 次查询', mode: 'READ UPDATED STATE', color: '#7553b8' },
  { label: '影响下一 token', mode: 'VISIBLE EFFECT', color: '#23845b' }
];

const stepNarratives = [
  '问题与教师答案一起经过一次冻结前向。插件只读取当前 hidden、教师 token、实体标签或视觉签名；此时还没有改动 Qwen 主干。',
  '写入前先查看插件当前保存的状态。这个状态会跨生成调用保留，是第 t 次和第 t+1 次推理之间真正的信息通道。',
  '预先规定的局部公式在 no_grad 中原位修改插件状态。没有 loss.backward()，也没有优化器或跨层梯度。',
  '下一次只给问题时，冻结 Qwen 产生新的查询 hidden。插件不再使用教师答案，而是从已经更新的状态中检索或读出。',
  '读出结果最终表现为 Decoder hidden 偏移或 LM Head logit 偏置。能否稳定输出正确答案，取决于目标、地址、顺序和拒绝机制是否齐全。'
];

let currentMethod = 0;
let currentStep = 0;
let timer = null;

const byId = id => document.getElementById(id);

function init() {
  renderNavigation();
  renderComparison();
  bindControls();
  selectMethod(0);
  window.setTimeout(updateMathStatus, 900);
}

function renderNavigation() {
  const nav = byId('methodNav');
  nav.innerHTML = methods.map((method, index) => `
    <button class="method-button" type="button" data-method="${index}" aria-label="切换到 ${method.title}">
      <span class="num">${String(index + 1).padStart(2, '0')}</span>
      <span class="name">${method.title}</span>
      <span class="hook">${method.hook.replace(' hook','')}</span>
    </button>`).join('');
  nav.addEventListener('click', event => {
    const button = event.target.closest('[data-method]');
    if (button) selectMethod(Number(button.dataset.method));
  });
}

function renderComparison() {
  byId('comparisonBody').innerHTML = methods.map((method, index) => `
    <tr data-method="${index}" tabindex="0">
      <td>${String(index + 1).padStart(2, '0')} · ${method.title}</td>
      <td>${method.state}</td>
      <td>${method.effect}</td>
      <td>${method.gap}</td>
    </tr>`).join('');
  const body = byId('comparisonBody');
  const activate = target => {
    const row = target.closest('[data-method]');
    if (row) {
      selectMethod(Number(row.dataset.method));
      byId('mainContent').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  };
  body.addEventListener('click', event => activate(event.target));
  body.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') activate(event.target);
  });
}

function bindControls() {
  byId('prevButton').addEventListener('click', () => setStep(currentStep - 1));
  byId('nextButton').addEventListener('click', () => setStep(currentStep + 1));
  byId('resetButton').addEventListener('click', () => { stopPlayback(); setStep(0); });
  byId('playButton').addEventListener('click', togglePlayback);
  byId('speedSelect').addEventListener('change', () => {
    if (timer) { stopPlayback(); startPlayback(); }
  });
  byId('flowTrack').addEventListener('click', event => {
    const step = event.target.closest('[data-step]');
    if (step) { stopPlayback(); setStep(Number(step.dataset.step)); }
  });
  byId('flowTrack').addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const step = event.target.closest('[data-step]');
    if (step) { event.preventDefault(); stopPlayback(); setStep(Number(step.dataset.step)); }
  });
  document.addEventListener('keydown', event => {
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A', 'SUMMARY'].includes(document.activeElement.tagName) || document.activeElement.closest('[data-step]')) return;
    const bounds = byId('mainContent').getBoundingClientRect();
    if (bounds.top > window.innerHeight || bounds.bottom < 0) return;
    if (event.key === 'ArrowLeft') setStep(currentStep - 1);
    if (event.key === 'ArrowRight') setStep(currentStep + 1);
    if (event.key === ' ') { event.preventDefault(); togglePlayback(); }
    if (/^[1-8]$/.test(event.key)) selectMethod(Number(event.key) - 1);
  });
}

function selectMethod(index) {
  stopPlayback();
  currentMethod = Math.max(0, Math.min(methods.length - 1, index));
  currentStep = 0;
  const method = methods[currentMethod];
  byId('methodNumber').textContent = String(currentMethod + 1).padStart(2, '0');
  byId('methodTitle').textContent = method.title;
  byId('methodTagline').textContent = method.tagline;
  byId('methodBadges').innerHTML = [method.hook, method.state, method.effect].map(x => `<span class="badge">${x}</span>`).join('');
  byId('stateLabel').textContent = method.state;
  document.querySelectorAll('[data-method]').forEach(el => el.classList.toggle('active', Number(el.dataset.method) === currentMethod));
  const activeMethodButton = document.querySelector('.method-button.active');
  document.querySelectorAll('.method-button').forEach(button => button.setAttribute('aria-pressed', String(button === activeMethodButton)));
  if (activeMethodButton) {
    byId('methodNav').scrollTo({ left: activeMethodButton.offsetLeft - 20, behavior: 'smooth' });
  }
  renderFlow();
  updateStep();
}

function renderFlow() {
  const method = methods[currentMethod];
  byId('flowTrack').innerHTML = stepMeta.map((meta, index) => `
    <article class="flow-step" role="button" tabindex="0" aria-label="步骤 ${index + 1}：${meta.label}" data-step="${index}" style="--step-color:${meta.color}">
      <span class="step-index">${index + 1}</span>
      <h4>${meta.label}</h4>
      <p>${shortDescription(method, index)}</p>
      <span class="mode-label">${meta.mode}</span>
    </article>`).join('');
}

function shortDescription(method, step) {
  const descriptions = [
    '完整问答进入冻结 Qwen，插件收集本地写入信号。',
    `检查当前的${method.state}，主干参数保持不变。`,
    method.formulas[2][2],
    '新问题重新产生查询 hidden，并读取更新后的插件。',
    `最终形成${method.effect}。`
  ];
  return descriptions[step];
}

function setStep(step) {
  currentStep = Math.max(0, Math.min(4, step));
  updateStep();
  if (currentStep === 4 && timer) stopPlayback();
}

function updateStep() {
  const method = methods[currentMethod];
  document.querySelectorAll('.flow-step').forEach((element, index) => {
    element.classList.toggle('active', index === currentStep);
    element.classList.toggle('completed', index < currentStep);
    element.setAttribute('aria-pressed', String(index === currentStep));
  });
  const activeFlowStep = document.querySelector('.flow-step.active');
  if (activeFlowStep) {
    const flowTrack = byId('flowTrack');
    flowTrack.scrollTo({ left: activeFlowStep.offsetLeft - (flowTrack.clientWidth - activeFlowStep.clientWidth) / 2, behavior: 'smooth' });
  }
  byId('stepCurrent').textContent = currentStep + 1;
  byId('progressFill').style.width = `${currentStep * 25}%`;
  const [title, formula, explanation] = method.formulas[currentStep];
  byId('formulaTitle').textContent = title;
  byId('formulaDisplay').textContent = formula;
  byId('formulaExplanation').textContent = explanation;
  byId('stepExplanation').textContent = stepNarratives[currentStep];
  byId('failureBoundary').textContent = method.boundary;
  renderMemory(method, currentStep);
  renderLogits(method, currentStep);
  typesetFormula();
}

function renderMemory(method, step) {
  const container = byId('memoryViz');
  const changed = step >= 2;
  const reading = step >= 3;
  if (['matrix', 'vocab', 'delta'].includes(method.type)) {
    const rows = method.type === 'matrix' ? 7 : 6;
    const cols = method.type === 'matrix' ? 9 : 11;
    let cells = '';
    for (let i = 0; i < rows * cols; i++) {
      const hot = changed && ((i + currentMethod * 3) % (method.type === 'vocab' ? 11 : 13) < 2);
      const energy = .12 + ((i * 17 + currentMethod * 11) % 65) / 100;
      cells += `<span class="matrix-cell ${hot ? 'hot' : ''}" style="--energy:${hot ? .78 : energy}"></span>`;
    }
    container.innerHTML = `<div class="matrix" style="--cols:${cols}">${cells}</div>`;
    byId('memoryCaption').textContent = changed
      ? `红色单元表示第 t 次观察新写入或修正的连接；${reading ? '第 t+1 次查询正在从这些单元读出。' : '写入后状态会保留到下一次调用。'}`
      : '蓝色单元表示写入前已有状态；冻结 Qwen 权重不在这张图中变化。';
    return;
  }
  if (method.type === 'prototype') {
    const tokens = ['苍','羽','-','92','云'];
    container.innerHTML = `<div class="prototype-viz">${tokens.map((token, i) => {
      const active = changed && i < 4;
      const height = 28 + i * 11 + (active ? 35 : 0);
      return `<div class="prototype ${active ? 'active' : ''}"><div class="prototype-bar" style="--height:${height}%"></div><span>${token}</span></div>`;
    }).join('')}</div>`;
    byId('memoryCaption').textContent = changed ? '目标 token 的上下文原型向本次 key 均值移动；同 token 的不同事实仍会被平均。' : '写入前，每个词表 token 只有一个历史上下文原型。';
    return;
  }
  if (method.type === 'slots') {
    const values = ['云岫-31','青梧-08','苍羽-92','星泉-44'];
    container.innerHTML = `<div class="slot-viz">${values.map((value, i) => `<div class="slot ${(changed && i === 2) || (reading && i === 2) ? 'active' : ''}"><span class="slot-id">SLOT ${i + 10}</span><span class="slot-key"></span><span class="slot-value">${value}</span></div>`).join('')}</div>`;
    byId('memoryCaption').textContent = reading ? '第 t+1 次首步检索锁定 SLOT 12；后续 token 都从同一 value 顺序回放。' : changed ? '新问答被保存为独立 key/value 槽位，不再压入共享矩阵。' : '写入前已有槽位彼此独立，每条 value 保存完整答案 token 序列。';
    return;
  }
  const tokens = ['苍','羽','-','92'];
  container.innerHTML = `<div class="transition-viz">${tokens.map((token, i) => `${i ? '<span class="transition-arrow">→</span>' : ''}<div class="transition-node ${(changed || reading) && (reading ? i === Math.min(currentStep - 3, 1) : true) ? 'active' : ''}"><small>step ${i}</small><strong>${token}</strong></div>`).join('')}</div>`;
  byId('memoryCaption').textContent = reading ? '首步门控确定 group 后，只允许同组下一 step 参与投票，避免答案串位。' : changed ? '答案被写成四个带 group、step、实体和上下文门控的 transition。' : '写入前，转移库中每条事实都拥有独立 group。';
}

function renderLogits(method, step) {
  const tokens = ['苍','羽','-','92','云'];
  const base = [43, 37, 31, 27, 39];
  const pluginActive = step >= 4;
  byId('logitBars').innerHTML = tokens.map((token, i) => {
    let extra = 0;
    if (pluginActive) {
      if (i === 0) extra = method.boost;
      else if (['vocab-hebbian','balanced-hebbian','vocab-ema'].includes(method.id)) extra = Math.round(method.boost * (i === 2 ? .45 : .16));
      else if (method.id === 'residual-hebbian' || method.id === 'residual-oja') extra = Math.round(method.boost * .55);
    }
    const total = Math.min(99, base[i] + extra);
    return `<div class="logit-row"><strong>${token}</strong><div class="bar-track"><span class="bar-base" style="width:${base[i]}%"></span><span class="bar-memory" style="--base:${base[i]}%;width:${extra}%"></span></div><span class="logit-value">${total}</span></div>`;
  }).join('');
}

function typesetFormula() {
  if (window.MathJax?.typesetPromise) {
    window.MathJax.typesetClear?.([byId('formulaDisplay')]);
    window.MathJax.typesetPromise([byId('formulaDisplay')]).then(updateMathStatus).catch(() => {
      byId('mathStatus').textContent = 'LaTeX 源码';
    });
  }
}

function updateMathStatus() {
  const rendered = Boolean(byId('formulaDisplay').querySelector('mjx-container'));
  byId('mathStatus').textContent = rendered ? 'LaTeX 已渲染' : 'LaTeX 加载中';
}

function togglePlayback() { timer ? stopPlayback() : startPlayback(); }

function startPlayback() {
  if (currentStep === 4) currentStep = 0;
  byId('playButton').setAttribute('aria-pressed', 'true');
  byId('playButton').querySelector('.play-icon').textContent = 'Ⅱ';
  byId('playButton').querySelector('.play-label').textContent = '暂停';
  updateStep();
  timer = window.setInterval(() => {
    if (currentStep >= 4) { stopPlayback(); return; }
    currentStep += 1;
    updateStep();
    if (currentStep === 4) stopPlayback();
  }, Number(byId('speedSelect').value));
}

function stopPlayback() {
  if (timer) window.clearInterval(timer);
  timer = null;
  byId('playButton').setAttribute('aria-pressed', 'false');
  byId('playButton').querySelector('.play-icon').textContent = '▶';
  byId('playButton').querySelector('.play-label').textContent = '自动播放';
}

document.addEventListener('DOMContentLoaded', init);
