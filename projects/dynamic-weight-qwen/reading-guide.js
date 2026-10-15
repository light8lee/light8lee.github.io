/* Reading notation: vectors are columns; t is a write, j is an answer token. */
const readingGuide = (() => {
  const math = s => String.raw`\[${s}\]`;
  const eq = (title, formula, explanation) => ({title, formula: math(formula), explanation});
  const data = [
    { state:'每层 W ∈ ℝʳˣᵈ + 活动 trace', target:'无 token 目标；统计整段问答活动', write:'共同活动的外积', read:'低秩查询 → hidden 残差', isolation:'共享矩阵；没有实体拒绝门', risk:'相关活动不等于可解码答案', bridge:'先看最直接的做法：把问答经过模型时的活动存成连接。这里的 W 输出 hidden 方向，列数是 d。', symbols:String.raw`\(p\in\mathbb R^r\) 是整段问答的平均低秩活动；\(s\in\mathbb R^d\) 是平均归一化 hidden 经 tanh 后的活动。\(z_q\in\mathbb R^r\) 是新问题当前 token 的低秩查询。\(\gamma\) 为学习率、奖励和新颖度的乘积；活动 trace 用于计算新颖度。`, steps:[
      eq('A · 从问答提取共同活动',String.raw`p=\operatorname{mean}(Z),\quad s=\tanh(\operatorname{mean}(N))`,'N 是选定层各位置 hidden 的 RMS 归一化结果；Z 是 N 经固定投影、tanh 和 L2 归一化后的低秩活动。残差插件不使用答案 mask，而是聚合整段输入。'),
      eq('B · 将外积写入插件',String.raw`\widetilde W_t=(1-\lambda)W_t`,'先衰减旧连接。波浪号统一表示衰减后的状态；下面再加本次增量。'),
      eq('C · 加强共同活动',String.raw`W_{t+1}=\widetilde W_t+\gamma ps^\top`,'p 与 s 的外积是 r×d 矩阵，恰好与 W 同形状。工程实现随后限制行范数并更新 trace。'),
      eq('D · 下一次从连接读回 hidden',String.raw`h'_q=h_q+\alpha W_{t+1}^\top z_q`,'Wᵀz 将 r 维查询变回 d 维方向，加到选中层输出；后续 Decoder、RMSNorm 和 LM Head 接着运行。') ]},
    { state:'每层 W ∈ ℝʳˣᵈ + 活动 trace',target:'无 token 目标；与 Hebbian 相同',write:'外积 − 活动依赖抑制',read:'同一 hidden 残差路径',isolation:'共享矩阵；没有实体拒绝门',risk:'控制增长，未解决答案对齐',bridge:'沿用 3.1 的 p、s、W 与读取路径，只改变写入项。这样可以单独理解“限制增长”究竟增加了什么。',symbols:String.raw`\(\operatorname{diag}(s^2)\) 是 d×d 对角矩阵，每一项为相应输出活动的平方。\(\widetilde W_t\) 沿用上节的衰减状态；\(\gamma,\alpha,z_q\) 含义不变。`,steps:[
      eq('A · 保留相同活动与衰减',String.raw`\widetilde W_t=(1-\lambda)W_t`,'仍由同一段问答提取 p、s；抑制项使用衰减后的连接，与代码执行顺序一致。'),
      eq('B · 写入相关性，同时抑制增长',String.raw`\begin{aligned}W_{t+1}=\widetilde W_t+\gamma\bigl(&ps^\top\\[-2pt]&-\widetilde W_t\operatorname{diag}(s^2)\bigr)\end{aligned}`,'第一项与 Hebbian 相同。第二项按各输出维度的活动能量削弱已有连接；工程实现随后限制行范数。'),
      eq('C · 读取方式不变',String.raw`h'_q=h_q+\alpha W_{t+1}^\top z_q`,'Oja 只使连接更新更稳定，没有告诉插件下一 token 应当是什么。') ]},
    {state:'W ∈ ℝʳˣⱽ',target:'assistant 的下一 token',write:'key 写入目标 token 列',read:'查询与各 token 列点积',isolation:'所有事实共享词表列；无拒绝门',risk:'公共 token 累积与事实串扰',bridge:'前两种方法没有明确的语言目标。现在把“答案前缀的 hidden”与“真正的下一 token”配对；W 的列数从 hidden 维度 d 换成词表大小 V。',symbols:String.raw`\(k_j\in\mathbb R^r\) 是预测教师 token \(y_j\) 之前的归一化 key；\(e_{y_j}\in\mathbb R^V\) 是只在目标 token 处为 1 的向量。\(\mathcal A\) 是 assistant 答案的目标位置集合。\(q_j\) 是新对话当前前缀产生的查询。`,steps:[
      eq('A · 对齐到下一 token',String.raw`k_j=\operatorname{code}(h_\theta(x,y_{<j}))`,'code 表示固定低秩投影与归一化。预测 yⱼ 的 hidden 只能看到问题和答案前缀 y＜ⱼ，不能看到当前目标。'),
      eq('B · 只加强目标列',String.raw`W_{t+1}=(1-\lambda)W_t+\eta\sum_{j\in\mathcal A}k_j e_{y_j}^\top`,'每个外积为 r×V；只有目标 token 对应的列被加强。这里奖励取 1；实际实现还限制被写入列的范数。'),
      eq('C · 将记忆得分加到基础 logits',String.raw`\ell'_j=\ell^{\mathrm{base}}_j+\alpha W_{t+1}^\top q_j`,'Wᵀq 产生 V 维候选分数。不同事实中的相同 token 共用一列，因此仍会互相干扰。') ]},
    {state:'W ∈ ℝʳˣⱽ + token 计数',target:'同一组下一 token 目标',write:'按历史频次缩小外积',read:'先归一化词表列，再点积',isolation:'共享词表列；仍无事实身份',risk:'频率平衡未消除身份混合',bridge:'沿用 3.3 的目标与矩阵，只处理“高频 token 因累计次数多而占优”的问题。写入缩放和读取归一化是两个不同步骤。',symbols:String.raw`\(c_t(v)\) 是 token v 的历史写入次数；\(a_j\) 是本次位置的缩放系数。\(W_{:,v}\) 是第 v 列；\(\varepsilon\) 防止除以零。`,steps:[
      eq('A · 历史次数决定本次强度',String.raw`a_j=\frac{1}{\sqrt{c_t(y_j)+1}}`,'例如历史计数为 3，本次缩放为 1/2；这是写入量的缩放，不是最终 logit 必然减半。'),
      eq('B · 将缩放用于同一外积',String.raw`W_{t+1}=(1-\lambda)W_t+\eta\sum_{j\in\mathcal A}a_j k_j e_{y_j}^\top`,'写入后更新 token 计数。事实仍压进同一组列。'),
      eq('C · 读取前消除列尺度差异',String.raw`\widehat W_{:,v}=\frac{W_{t+1,:,v}}{\max(\|W_{t+1,:,v}\|_2,\varepsilon)}`,'逐列归一化；下一式用的是归一化后的矩阵，而不是上一步的原始 W。'),
      eq('D · 读取平衡后的分数',String.raw`\ell'_j=\ell^{\mathrm{base}}_j+\alpha\widehat W^\top q_j`,'减弱频次偏置，但没有恢复每条事实的身份与答案顺序。') ]},
    {state:'W ∈ ℝʳˣⱽ',target:'one-hot 目标 − 当前预测',write:'局部 Delta 误差修正',read:'修正矩阵的查询点积',isolation:'有限秩共享映射；无拒绝门',risk:'改一个 key 影响相似 key',bridge:'频率平衡只改变更新幅度。Delta 进一步问：当前映射已经预测了多少？只将目标与预测的差写回。',symbols:String.raw`\(n=|\mathcal A|\) 是答案目标位置数。\(K\in\mathbb R^{n\times r}\) 的每一行是一个 \(k_j^\top\)；\(Y\in\mathbb R^{n\times V}\) 每行是对应 one-hot 目标。\(E\) 是 n×V 的局部误差，不是主干梯度。`,steps:[
      eq('A · 先衰减，再预测',String.raw`\widetilde W_t=(1-\lambda)W_t`,'代码先衰减旧矩阵，再用这个矩阵计算教师位置上的预测。'),
      eq('B · 得到插件尚未解释的误差',String.raw`E=Y-K\widetilde W_t`,'K W̃ 的每一行都是插件对词表的预测分数；与目标 Y 相减。'),
      eq('C · 将误差映回快权重',String.raw`W_{t+1}=\widetilde W_t+\frac{\eta}{n}K^\top E`,'KᵀE 的形状为 r×V。实现直接计算并更新插件，不让误差穿过 Qwen；之后对目标列做范数限制。'),
      eq('D · 查询修正后的矩阵',String.raw`\ell'_j=\ell^{\mathrm{base}}_j+\alpha W_{t+1}^\top q_j`,'读取与 3.3 相同。相似 key 会共享这次修正，所以局部纠错仍可能干扰其他事实。') ]},
    {state:'每 token 一个 r 维原型',target:'目标 token 对应的 key 集合',write:'新旧原型移动平均',read:'查询与原型点积',isolation:'同 token 共用原型；无拒绝门',risk:'平均掉事实身份和位置',bridge:'Delta 维护一个共享映射；EMA 则把每列直接解释为“这个 token 常见于什么上下文”的原型。两者存储形状相同，更新含义不同。',symbols:String.raw`\(\mathcal K_v\) 收集本批目标为 token v 的 key。\(p_{v,t}\) 是 W 的第 v 列；\(m\) 为旧原型保留比例，\(R\) 为目标原型尺度。以下奖励取 1；实现中 \(m=\mathrm{clip}(1-\eta,0,0.99)\)。`,steps:[
      eq('A · 求同一 token 的上下文平均',String.raw`\mu_v=\frac{1}{|\mathcal K_v|}\sum_{k\in\mathcal K_v}k`,'只处理本批出现的目标 token。先平均，再归一化为单位方向。'),
      eq('B · 混合旧原型与新方向',String.raw`p_{v,t+1}=m(1-\lambda)p_{v,t}+(1-m)R\,\operatorname{norm}(\mu_v)`,'原型先经历统一衰减，再做移动平均，随后限制范数。未出现的 token 只衰减；多个事实中的同一 token 被合成一个方向。'),
      eq('C · 原型相似度成为 token 分数',String.raw`\ell'_j(v)=\ell^{\mathrm{base}}_j(v)+\alpha p_{v,t+1}^\top q_j`,'每个候选 token v 都有一个原型得分。这里保存的是上下文平均，不是独立问答。') ]},
    {state:'M 个独立 key / 答案序列槽',target:'一整段教师答案 token',write:'相似地址覆盖，否则追加',read:'首步选槽，后续按位置回放',isolation:'独立槽 + 相似度阈值；无实体门',risk:'首地址错配导致整段错误回放',bridge:'前面四种输出方法把事实压进共享矩阵。KV Replay 放弃这种压缩，为每个问答保存独立的 key 和完整答案。这里的 KV 是插件存储，不是 Transformer 的 attention KV cache。',symbols:String.raw`\(i\) 是槽位编号，\(M\) 为槽数。\(k_i,q_0\in\mathbb R^d\) 是单位化的完整 hidden，无 r 维投影。\(v_i[j]\) 是槽 i 答案的第 j 个 token；\(\rho\) 是检索阈值，\(\beta\) 是回放偏置。`,steps:[
      eq('A · 写入一个地址与完整答案',String.raw`(k_i,v_i)=\bigl(\operatorname{norm}(h_\theta(x,\varnothing)),y\bigr)`,'地址取答案首 token 之前的 hidden，value 保存教师答案 token 序列。相似地址可覆盖旧槽，容量满后复用槽位。'),
      eq('B · 首步选择槽位',String.raw`i^*=\arg\max_{1\le i\le M}q_0^\top k_i`,'先找最相似的槽；最大相似度达到 ρ 才锁定它，否则不注入。相似度阈值不等于能可靠识别实体。'),
      eq('C · 命中后逐 token 回放',String.raw`\ell'_j(v)=\ell^{\mathrm{base}}_j(v)+\beta\mathbf1[v=v_{i^*}[j]]`,'仅在已接受槽位且答案未结束时使用此式；未命中时偏置为 0。首步错选会沿整条错误答案继续加分。') ]},
    {state:'逐 token 的 key / 目标 / group / step',target:'每个答案位置的下一 token',write:'按身份和上下文安全覆盖轨迹',read:'首步门控；同组同位置 top-k 投票',isolation:'独立轨迹 + 实体 / 词法 / 视觉门',risk:'依赖门控泛化，容量随 token 增长',bridge:'保留独立存储，再把“整段答案”拆为“每一步转移”。与 KV Replay 的关键区别是首步多重拒绝门，以及随后按 group / step 约束检索。',symbols:String.raw`\(g\) 为问答轨迹编号，\(j\) 为轨迹内位置；\(k_{g,j}\in\mathbb R^d\) 为完整 hidden 地址，\(y_{g,j}\) 为目标 token。实体标签、稀有 token 指纹及可选图片签名是附加门控信息。\(\mathcal C_j\) 为允许参与当前检索的候选集合。`,steps:[
      eq('A · 为每个答案位置保存转移',String.raw`\mathcal T_g=\{(k_{g,j},y_{g,j},g,j)\}_{j=0}^{m_g-1}`,'m_g 为本条答案的 token 数。轨迹另附身份和上下文信息；只有实体、上下文和起始 hidden 匹配，才覆盖旧轨迹。'),
      eq('B · 首步先过滤，再检索',String.raw`(g^*,0)=\arg\max_{(g,0)\in\mathcal C_0}q_0^\top k_{g,0}`,'C₀ 只包含通过实体、词法、可选视觉检查的起始位置，还要通过 hidden 相似度阈值。没有合格候选时，基础 logits 原样返回。'),
      eq('C · 后续只看同组、同位置',String.raw`\mathcal C_j=\{(g,s):g=g^*,\ s=j\}`,'在有效候选中做 top-k 相似度加权投票，选出当前 token y*ⱼ。这个集合公式只表达轨迹约束；实现还检查有效长度和继续检索阈值。'),
      eq('D · 把选中的 token 接回生成',String.raw`\ell'_j(v)=\ell^{\mathrm{base}}_j(v)+\beta\mathbf1[v=y_j^*]`,'投票成功时为获胜 token 加分；失败或轨迹结束时不注入。Qwen 仍执行自回归生成，插件本身不更新主干参数。') ]}
  ];
  function diagram(i) {
    const residual=i<2;
    return `<div class="method-route" aria-label="${residual?'Decoder 输出残差':'LM Head 输出'}注入路径"><div class="route-node native"><small>原生 · 冻结参数</small>${residual?'选中 Decoder 层 → hidden':'Final RMSNorm → hidden'}</div><div class="route-arrow" aria-hidden="true">↓ 分支读取</div><div class="route-node injected"><small>新增 · 可写插件</small>${data[i].state}<br><span>${data[i].read}</span></div><div class="route-arrow" aria-hidden="true">↓ ${residual?'在选中层输出相加':'与原生 LM Head 分数相加'}</div><div class="route-node native"><small>原生 · 继续前向</small>${residual?'后续层 → RMSNorm → LM Head':'采样 / 贪心选择下一 token'}</div></div>`;
  }
  function formulas(i) {
    const d=data[i];
    return `<p class="method-bridge">${d.bridge}</p>${diagram(i)}<div class="local-symbols"><b>本节新增变量</b><p>${d.symbols}</p></div><div class="formula-chain">${d.steps.map((s,j)=>`<div class="formula-step"><h4>${s.title}<span>(${i+3}.${j+1})</span></h4><div class="equation">${s.formula}</div><p>${s.explanation}</p></div>`).join('')}</div>`;
  }
  return {data,diagram,formulas};
})();
