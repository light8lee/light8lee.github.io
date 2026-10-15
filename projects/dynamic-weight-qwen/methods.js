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
      ['下一次读取', String.raw`\[d_q=(W_{t+1}^{\mathrm{fast}})^\top z_q\]`, '相似问题产生查询 code，并从刚更新的层内矩阵读出记忆方向。'],
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
      ['Oja 写入', String.raw`\[\begin{aligned}\widetilde W_t&=(1-\lambda)W_t\\W_{t+1}&=\widetilde W_t+\gamma(ps^\top-\widetilde W_t\operatorname{diag}(s^2))\end{aligned}\]`, 'W̃ 是衰减后的快权重。第一项加强相关连接，第二项抑制已有连接；随后执行范数限制。'],
      ['下一次读取', String.raw`\[d_q=W_{t+1}^\top z_q\]`, '查询仍然只按 hidden code 从更新后矩阵读取。'],
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
      ['下一次读取', String.raw`\[\ell_{\mathrm{dyn}}=W_{t+1}^\top q_j\]`, '新问题的 key 与历史 key 越相似，对应目标列得到的分数越大。'],
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
      ['合并 logits', String.raw`\[\ell^{\prime}=\ell_{\mathrm{base}}+\alpha\widehat W^\top q_j\]`, '下一次推理不再只因某一列范数大而选择高频 token。']
    ]
  },
  {
    id: 'vocab-delta', title: 'Vocab Delta', hook: 'LM Head hook', state: '误差修正矩阵', type: 'delta',
    tagline: '先计算当前快权重已经预测了什么，只把尚未解释的局部输出误差写回。',
    boundary: '局部误差更有方向，但所有映射仍被压进有限秩矩阵；修正一个 key 可能覆盖邻近 key。',
    gap: '有限秩覆盖冲突', effect: '相似度加权纠错', boost: 20,
    formulas: [
      ['形成局部误差', String.raw`\[E=Y-K\widetilde W_t\]`, '先得到衰减矩阵 W̃=(1−λ)W，再用 one-hot 目标减去当前预测；误差只存在于插件输出端。'],
      ['更新前状态', String.raw`\[W_t\in\mathbb R^{r\times V}\]`, '冻结 Qwen 的 hidden 只是 key，主干不接收误差信号。'],
      ['Delta 写入', String.raw`\[W_{t+1}=\widetilde W_t+\frac{\eta}{n}K^\top E\]`, 'n 是参与更新的答案位置数。局部更新直接改写快权重，不构建计算图。'],
      ['下一次读取', String.raw`\[\Delta\ell_q=\frac{\eta}{n}E^\top Kq_j\]`, '这里只计算本次 Delta 增量对查询的额外影响；不包含旧矩阵、裁剪和最终注入强度。'],
      ['合并 logits', String.raw`\[\ell^{\prime}=\ell_{\mathrm{base}}+\alpha W_{t+1}^\top q_j\]`, '被纠正后的低秩映射在下一次 LM Head 输出处参与决策。']
    ]
  },
  {
    id: 'vocab-ema', title: 'Vocab EMA', hook: 'LM Head hook', state: '每 token 一个原型', type: 'prototype',
    tagline: '不保存完整映射，而为每个 token 维护“通常在什么上下文出现”的移动平均原型。',
    boundary: '一个 token 只有一个原型，不同事实、答案位置和新旧版本会被平均成同一个方向。',
    gap: '平均掉身份与顺序', effect: '原型相似度 logits', boost: 10,
    formulas: [
      ['按 token 聚合', String.raw`\[\mu_v=\frac{1}{|\mathcal K_v|}\sum_{k_i\in\mathcal K_v}k_i\]`, '把本批所有目标为 token y 的 key 求平均。'],
      ['更新前状态', String.raw`\[S_t=\{p_{v,t}\}_{v=1}^{V}\]`, '每个词表 token 只有一个上下文原型。'],
      ['EMA 写入', String.raw`\[p_{v,t+1}=m(1-\lambda)p_{v,t}+(1-m)R\operatorname{norm}(\mu_v)\]`, '先衰减，再用动量 m 混合新旧方向；R 为目标尺度。教学数字取衰减 0、尺度与奖励 1。'],
      ['下一次读取', String.raw`\[s_v(q_j)=p_{v,t+1}^\top q_j\]`, '查询越像某个 token 的历史平均上下文，该 token 得分越高。'],
      ['合并 logits', String.raw`\[\ell_j^{\prime}(v)=\ell_j^{\mathrm{base}}(v)+\alpha s_v(q_j)\]`, '原型相似度在下一次推理中成为额外 token 分数。']
    ]
  },
  {
    id: 'kv-replay', title: 'KV Replay', hook: 'LM Head hook', state: '独立问答槽位', type: 'slots',
    tagline: '给每条问答一个独立槽位：首步找到地址，后续按顺序回放整段答案。',
    boundary: '独立 value 避免压缩冲突，但首地址只靠连续 hidden；一旦选错槽位，后续整段都会稳定回放错。',
    gap: '首地址容易误触发', effect: '锁槽后的 token 回放', boost: 50,
    formulas: [
      ['提取地址与答案', String.raw`\[k_i=\operatorname{norm}(h_\theta(x,\varnothing)),\quad v_i=y\]`, '答案首 token 前的 hidden 作为整条问答地址，完整答案序列作为 value。'],
      ['更新前状态', String.raw`\[S_t=\{(k_i,v_i)\}_{i=1}^{M}\]`, '每条事实拥有独立槽位，不再共享一个词表矩阵。'],
      ['追加或覆盖槽位', String.raw`\[S_{t+1}=\operatorname{upsert}(S_t,k_{\mathrm{new}},v_{\mathrm{new}})\]`, 'upsert 表示高相似地址覆盖旧槽位，否则追加；容量满后按环形位置复用。'],
      ['首步检索', String.raw`\[i^*=\arg\max_i q_0^{\top}k_i\]`, '首 token 前选槽，且最大相似度必须达到阈值 ρ 才锁定；未命中时不注入。'],
      ['逐步回放', String.raw`\[\ell_j^{\prime}(y)=\ell_j(y)+\beta\,\mathbf 1[y=v_{i^*}[j]]\]`, '每一步只给槽位中对应位置的 token 增加偏置。']
    ]
  },
  {
    id: 'token-knn', title: 'Token kNN', hook: 'LM Head hook', state: '带门控的逐 token 转移', type: 'transitions',
    tagline: '把答案拆成逐 token 轨迹：身份门控选事实，hidden 处理改写，group/step 保持连续。',
    boundary: '当前门控在合成实体和实例图片上有效；自然实体、强改写与自然图像仍需要更通用的身份表示。',
    gap: '门控泛化与容量成本', effect: '受门控的逐 token 偏置', boost: 56,
    formulas: [
      ['拆成转移轨迹', String.raw`\[\mathcal T_g=\{(k_{g,j},y_{g,j},g,j)\}_{j=0}^{m_g-1}\]`, '每个答案 token 都有自己的 key、group、step、实体标签和上下文签名。'],
      ['更新前状态', String.raw`\[S_t=\bigcup_g\mathcal T_g\]`, '记忆库保存独立轨迹，而不是把所有事实压进共享矩阵。'],
      ['安全覆盖并追加', String.raw`\[\operatorname{same}=G_{\mathrm{entity}}\land G_{\mathrm{context}}\land G_{\mathrm{cosine}}\]`, 'G 是布尔匹配条件，∧ 表示同时通过；实体、可选图片上下文和起始 hidden 都匹配才覆盖旧 group。'],
      ['首步多门控检索', String.raw`\[i^*=\arg\max_{i\in\mathcal C_0}q_0^{\top}k_i\]`, '候选先通过实体、词法、视觉和起始位置门控，再比较语义相似度。'],
      ['组内逐步投票', String.raw`\[\ell_j^{\prime}(y)=\ell_j(y)+\beta\,\mathbf 1[y=y_j^*]\]`, '命中后只在同一 group 和 step 内 top-k 投票；失败则完全返回基础 logits。']
    ]
  }
];
