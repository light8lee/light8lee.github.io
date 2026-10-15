---
layout: default
nav_section: projects
title: "动态权重 Qwen：从一次问答到八种记忆方案的逐步解释"
---

> **历史教师问答协议说明：** 本文的问答示例和成绩属于旧的人工 assistant 目标写入 / 回放实验，不能作为从 user 多轮对话形成记忆的结论。新实验仅观察 user 内容，并用独立进程评估；请以 [user 对话重新实验报告](user-dialogue-experiment-report.html) 为当前结论。

<style>.experiment-document{max-width:1000px;margin:auto;line-height:1.9;overflow-wrap:anywhere}.experiment-document img{max-width:100%;height:auto}.experiment-document pre,.experiment-document table{display:block;overflow:auto}.experiment-document h2{margin-top:2.5em}.experiment-document mjx-container{max-width:100%;overflow-x:auto}</style>
<div class="experiment-document" markdown="1">

[← 返回交互实验台](../)

# 动态权重 Qwen：从一次问答到八种记忆方案的逐步解释

这篇文档是架构图的文字说明书。即使不看图片，也应该能够顺着一次数据流理解：Qwen 原本怎样计算、插件插在哪里、观察时更新了什么、生成时怎样读出，以及为什么某些方法“权重变了却仍然记不住”。

配套图片见：

- [LaTeX 推理时更新与跨次影响图解](inference-update-latex-guide.html)：专门解释第 $t$ 次观察怎样更新状态，以及第 $t+1$ 次推理怎样读出；公式使用 MathJax/KaTeX 语法；
- [网络逐层计算与底层公式](layerwise-architecture-diagrams.html)
- [快速架构图与运行示意](architecture-diagrams.html)
- [完整实验报告](comprehensive-experiment-report.html)

## 1. 先用一条事实贯穿全文

假设要让模型临时记住一条预训练中不存在的事实：

```text
问题：霁舟-17 的通行码是什么？
答案：苍羽-92
```

为了便于理解，下面把答案粗略写成四个 token：

```text
第 0 步：苍
第 1 步：羽
第 2 步：-
第 3 步：92
```

这只是讲解用的简化。真实 token 边界由 Qwen tokenizer 决定，可能不是四个 token。但无论实际分成多少个 token，插件的工作单位都是真实 tokenizer 产生的位置。

系统有两个完全不同的运行模式。

### 1.1 观察模式：把问答展示给模型

调用：

```text
observe_pair(question="霁舟-17 的通行码是什么？", answer="苍羽-92")
```

实际发生的顺序是：

1. 先把只有用户问题的消息套入 Qwen chat template，得到“答案应该从哪里开始”的前缀 token；
2. 再把用户问题和教师答案一起套入同一个 template，得到完整 token 序列；
3. 验证完整序列的前半段与问题前缀逐 token 一致；
4. 创建 `teacher_mask`，只把 assistant 答案位置标为 `True`；
5. 将完整 token、答案 mask、实体标签或视觉签名交给插件；
6. 开启插件的 plasticity 模式；
7. 对完整问答执行一次冻结 Qwen 前向，`use_cache=False`；
8. 插件在自己的 hook 中读取隐藏状态和教师 token，直接原位修改快权重或记忆张量；
9. 关闭 plasticity，并清除临时教师信号。

这里没有“先生成错误答案，再算损失，再反向传播”。教师答案只被插件用于决定要存储的 value 或目标 token。

### 1.2 生成模式：只给问题，让插件尝试回忆

调用：

```text
generate("霁舟-17 的通行码是什么？")
```

实际顺序是：

1. 格式化问题，得到输入 token；
2. 提取查询 token 指纹、实体标签和可选视觉签名；
3. 调用 `begin_generation()`，将 group、step、active slot 等运行时状态复位；
4. Qwen 计算第一个待生成位置的基础 logits；
5. 插件在 hook 中读取当前隐藏状态和自己的持久化记忆；
6. 若检索成功，插件只在指定 token 的 logit 上增加偏置；若失败，则原样返回基础 logits；
7. 贪心解码选出一个 token，并把它追加到上下文；
8. 对下一个位置重复第 4–7 步，直到 EOS 或达到长度上限；
9. 调用 `end_generation()` 并清理临时查询状态。

因此，“观察”和“生成”都运行 Qwen 前向，但只有观察模式会写入；普通生成默认只读。

## 2. Qwen 主干本来怎样计算

八种方案共享同一个冻结 Qwen 主干。先理解主干，才能知道插件改变的是哪一段。

### 2.1 模型级顺序

```text
input_ids [B,T]
  ↓ Token Embedding
X₀ [B,T,d]
  ↓ Decoder Layer 0
X₁
  ↓ Decoder Layer 1
...
  ↓ Decoder Layer L−1
Xᴸ
  ↓ Final RMSNorm
H [B,T,d]
  ↓ LM Head
logits [B,T,V]
```

符号含义：

| 符号 | 含义 |
|---|---|
| `B` | batch size，本实验通常为 1 |
| `T` | 当前序列 token 数 |
| `d` | Qwen hidden size，随模型尺寸变化 |
| `L` | Decoder Layer 数量 |
| `V` | 词表大小 |
| `r` | 快权重使用的低秩维度，默认 32 |

### 2.2 单个 Decoder Layer 的顺序

令第 `ℓ` 层输入为 `Xℓ ∈ R[B,T,d]`。

第一步，注意力前归一化：

```text
U = RMSNorm(Xℓ)
```

RMSNorm 把每个 token 位置的向量尺度拉回稳定范围，但保留方向。可以把它理解成“先统一音量，再判断内容”。

第二步，生成 Query、Key、Value：

```text
Q = U Wq
K = U Wk
V = U Wv
```

- Query 表示当前位置要寻找什么；
- Key 表示每个历史位置可以怎样被索引；
- Value 表示该位置真正提供的内容。

Qwen3 还会对 Q/K 做归一化，并加入 RoPE 旋转位置编码。RoPE 让注意力同时知道“内容相似”和“相隔多远”。

第三步，因果分组查询注意力：

```text
A = softmax(QKᵀ / sqrt(d_head) + causal_mask) V
O = A Wo
```

`causal_mask` 禁止当前 token 查看未来 token。GQA 表示多个 query head 可以共享较少的 key/value head，从而降低缓存和计算成本。

第四步，第一次残差相加：

```text
R = Xℓ + O
```

注意力输出不是直接替换原状态，而是添加到原状态上。这样即使注意力在某一步不可靠，原始信息仍有一条直通路径。

第五步，MLP 前归一化：

```text
M = RMSNorm(R)
```

第六步，SwiGLU MLP：

```text
G = SiLU(M Wgate) ⊙ (M Wup)
F = G Wdown
```

注意力主要负责 token 之间交换信息，MLP 主要负责每个 token 位置内部的非线性特征变换。

第七步，第二次残差相加：

```text
Hℓ = R + F
```

`Hℓ` 就是一个完整 Decoder Layer 的返回值。

### 2.3 两类插件位置

本项目只有两个接入位置。

第一类是 Decoder Layer 输出 hook：

```text
Hℓ → residual fast-weight adapter → H'ℓ → 下一层
```

只有 `residual_hebbian` 和 `residual_oja` 使用它。默认挂在最后若干 Decoder Layer，每层有一套独立快权重。

第二类是 LM Head 输出 hook：

```text
H → LM Head → base logits → memory hook → adapted logits
```

其余六种方法都在这里工作。它们不改变 Decoder 内部隐藏流，只改变最终词表分数或使用 LM Head 输入隐藏状态做检索。

## 3. 什么叫“不反向传播但仍然学习”

标准训练大致是：

```text
预测 → 计算 loss → backward 得到 ∂loss/∂W → optimizer.step()
```

本项目是：

```text
前向得到局部活动或 hidden
  ↓
用预先规定的公式直接计算 ΔW 或要写入的键值
  ↓
在 torch.no_grad() 中执行 W.add_ / W.mul_ / W.copy_
```

例如 Hebbian 规则直接规定：

```text
ΔW = η · pre ⊗ post
```

它不需要知道某个全局 loss 对 `W` 的导数。只要拿到突触两侧活动，就能直接修改 `W`。

这依然是一种学习，因为系统状态会因经验发生持久变化；它只是不是梯度下降。代价是：没有梯度替你回答“怎样改才能让最终语言模型损失下降”，更新方向必须由设计者自己保证。

代码层面的边界是：

- Qwen 所有参数均为 `requires_grad=False`；
- 模型运行在 `eval()`；
- 观察和生成使用 `torch.inference_mode()`；
- 写入前的 hidden/code 会 `detach()`；
- 插件张量也可以是 `requires_grad=False` 的 `Parameter` 或 buffer；
- 插件仍可在 `no_grad` 环境中原位修改这些张量；
- 从不调用 `loss.backward()`。

## 4. 方案一：Residual Hebbian

### 4.1 直觉

如果两组神经活动经常同时出现，就加强它们之间的连接。这对应经典的“共同激活则连接增强”直觉。

在本项目中，某个 Qwen 层输出 `Hℓ` 会分出一条低秩旁路：

```text
标准主路：Hℓ ─────────────────────→ 下一层
旁路：    Hℓ → 编码 Zℓ → Wℓfast → ΔHℓ ─┘
```

### 4.2 推理时怎样读取

先对层输出做 RMS 归一化：

```text
N = H / sqrt(mean(H²) + ε)
```

再通过固定随机矩阵 `E ∈ R[d,r]` 压缩到低秩空间：

```text
Z = normalize(tanh(N E))
```

`E` 不学习。它只是把 `d` 维隐藏状态投到 `r` 维，使动态矩阵从 `d×d` 缩小为 `r×d`。

读取快权重：

```text
D = Z Wfast
Hout = H + αD
```

`α` 控制记忆旁路对原始 Qwen 的影响强度。`α=0` 时插件完全失效；过大则可能破坏主干分布。

### 4.3 观察时怎样写入

把所有 batch 和 token 位置的低秩 code 求平均：

```text
p = mean(Z) ∈ R[r]
```

把归一化隐藏状态求平均并压到 `[-1,1]`：

```text
s = tanh(mean(N)) ∈ R[d]
```

计算新奇度：

```text
novelty = 1                              if trace is empty
novelty = clip(1 - cosine(p, trace),0,2) otherwise
```

熟悉模式与 trace 越相似，更新越弱。最终写入：

```text
γ = learning_rate × reward × novelty
Wfast ← (1-decay)Wfast + γ(p ⊗ s)
```

最后限制每一行的 L2 范数，并更新活动 trace。

### 4.4 用示例理解

观察“霁舟-17 → 苍羽-92”时，问题和答案产生一组层内平均活动 `p`、`s`，二者外积被写入 `Wfast`。以后相似问题若产生相似 `Z`，就会从 `Wfast` 读出相似的隐藏偏移 `D`。

但更新公式里没有“苍”“羽”“92”分别是哪个目标 token。它只知道整段问答中哪些活动同时发生。因此它可能改变生成风格或隐藏方向，却不能保证把概率精确推向“苍羽-92”。

### 4.5 为什么实验失败

30 条事实从第一阶段就接近 0%，不是后来遗忘，而是没有形成可解码的目标记忆。它证明：局部权重发生变化、logits 发生变化，都不能单独证明模型记住了事实。

## 5. 方案二：Residual Oja

### 5.1 它与 Hebbian 的共同部分

读取路径完全相同：

```text
H → RMSNorm → 固定低秩编码 Z → Woja → 残差注入
```

区别只在观察时的写入公式。

### 5.2 Oja 项解决什么

纯 Hebbian 外积不断累加，强连接可能越来越强。Oja 在正相关项后增加一个与当前权重和突触后活动平方相关的负项：

```text
Ahebb = p ⊗ s
Aoja = Ahebb - W ⊙ [1r (s ⊙ s)ᵀ]
W ← (1-decay)W + γ Aoja
```

直觉上：

- `p⊗s` 说“这次共同活动应该加强”；
- `W⊙s²` 说“已经很强、而且当前输出活动很大的连接应该受到抑制”。

### 5.3 为什么仍然记不住

Oja 回答的是“怎样避免局部连接发散”，没有回答“正确答案是哪一个 token”。因此它可以比 Hebbian 更稳定，却不会凭空获得语言监督。

这也是一个重要区分：

```text
数值稳定性问题 ≠ 目标对齐问题
```

如果一个规则更新方向本身没有对准答案，给它加再好的归一化也不会自动变成事实记忆。

## 6. 方案三：Vocab Hebbian

### 6.1 为什么从层内旁路移到 LM Head

前两个方案不知道目标 token。本方案直接使用教师 next token，把隐藏 key 写到该 token 对应的词表列。

LM Head 前的隐藏状态为 `H ∈ R[B,T,d]`。先产生低秩 key：

```text
K = normalize(tanh(RMS(H) E))
K ∈ R[B,T,r]
```

快权重矩阵变成：

```text
Wvocab ∈ R[r,V]
```

每一列对应一个词表 token。

### 6.2 读取过程

Qwen 原本产生：

```text
Lbase = LMHead(H)
```

插件产生：

```text
Ldynamic = K Wvocab
Lfinal = Lbase + α Ldynamic
```

因此它并不替代基础语言模型，只给每个 token 增加额外分数。

### 6.3 写入过程

对于答案中的一个位置，令当前位置之前的 key 为 `ki`，真实下一个 token 为 `yi`：

```text
Wvocab[:, yi] += η × reward × ki
```

用外积写法等价于：

```text
ΔW = η × ki ⊗ one_hot(yi)
```

外积结果只有 `yi` 那一列非零。

以“苍羽-92”为例：

```text
问题结尾 hidden → k0 → 增强“苍”这一列
问题 + “苍” → k1 → 增强“羽”这一列
问题 + “苍羽” → k2 → 增强“-”这一列
问题 + “苍羽-” → k3 → 增强“92”这一列
```

它已经具备正确的自回归 teacher forcing 对齐。

### 6.4 为什么仍然失败

所有事实都共享同一个 `Wvocab`。假设 30 个答案都包含破折号、数字、句号或相同回答句式，这些 token 列会被反复写入很多不同 key。

最终一列不再表示“霁舟-17 之后应该出现这个 token”，而变成“很多场景都曾出现这个 token”的混合方向。高频 token 形成公共吸引子，事实身份消失。

实验中，它没有记住 30 条事实，却改变了 MMLU 20 题中 45% 的完整输出，并使正确率下降 10 个百分点。这说明共享输出矩阵的污染可以扩散到无关任务。

## 7. 方案四：Balanced Vocab Hebbian

### 7.1 它修复什么

如果一个 token 已出现很多次，就降低它下一次写入强度：

```text
scale(yi) = 1 / sqrt(count[yi] + 1)
W[:, yi] += η × reward × scale(yi) × ki
```

读取前还把每一列归一化：

```text
W_hat[:,y] = W[:,y] / max(norm(W[:,y]), ε)
Ldynamic = K W_hat
```

这样一个 token 不会仅仅因为写入次数多、列范数大而获胜。

### 7.2 为什么只部分有效

它解决了“量”的偏置，却没有解决“归属”的混合。

例如两个事实都包含 token“羽”，归一化只能让“羽”列不过大，不能把这一列拆成：

```text
霁舟-17 的“羽”
另一个实体答案中的“羽”
```

因此小规模实验稍有改善，扩展到 30 条后仍只有 3.3%。MMLU 平均分虽然不变，但 25% 输出发生变化，说明行为仍在漂移。

## 8. 方案五：Vocab Delta

### 8.1 与 Hebbian 的核心区别

Hebbian 只会说“把正确 token 再增强一点”。Delta rule 会先问：“当前快权重已经预测成什么？”然后只修正误差。

选出答案位置的 key：

```text
Ks ∈ R[N,r]
```

把真实 token 转成 one-hot：

```text
Vtarget ∈ R[N,V]
```

当前快权重预测：

```text
P = Ks W
```

局部输出误差：

```text
Eout = Vtarget - P
```

更新：

```text
W ← (1-decay)W + (η × reward / N) Ksᵀ Eout
```

### 8.2 为什么这不算反向传播

`Eout` 只存在于快权重输出端。系统不会计算它对 Qwen 各层参数的链式导数，也不会把误差传回 attention、MLP 或 embedding。

这是一个明确写出的闭式局部规则：给定 `K`、`W`、`Vtarget`，直接算出新的 `W`。

### 8.3 为什么仍然失败

Delta rule 可以修正当前 key，却仍把所有 key→token 映射塞进同一个有限秩 `r×V` 矩阵。修正一个 key 的预测可能改变其他相近 key 的输出。

在从头训练的 Fast Weight Programmer 中，key 空间可以与 Delta 更新机制共同塑造。本项目把它事后接到冻结 Qwen 上，不能假设现有 hidden 天然满足低干扰线性写入。

## 9. 方案六：Vocab EMA

### 9.1 它保存的不是映射，而是原型

对于每个词表 token `y`，收集所有目标为 `y` 的 key：

```text
Sy = {ki | yi = y}
```

计算本批平均：

```text
μy = mean(Sy)
p_hat_y = max_norm × normalize(μy)
```

更新该 token 的原型：

```text
momentum = clip(1-learning_rate, 0, 0.99)
py ← momentum × py + (1-momentum) × reward × p_hat_y
```

推理时：

```text
score(y) = kᵀ py
```

### 9.2 为什么容易理解，也容易失败

它在问：“当前上下文像不像通常会生成 token `y` 的上下文？”

但一个 token 可能出现在很多事实、很多位置和很多语义中。所有这些 key 最终被压成一个向量 `py`。这种压缩不可逆地丢掉：

- 属于哪条问答；
- 位于答案第几步；
- 前后应该接什么 token；
- 是旧事实还是刚写入的新事实。

因此它在 30 条事实中只达到 3.3%，同时让 MMLU 20 题的输出 100% 改变，正确率从 40% 降到 0%。这是所有对照中最明显的全局漂移。

## 10. 方案七：KV Replay

### 10.1 为什么它突然能记住

KV Replay 不再把很多事实压进一个共享矩阵，而是给每条问答一个独立槽位：

```text
slot i:
  key[i]   = 问题结尾 hidden
  value[i] = 完整答案 token 序列
  length[i]= 答案长度
```

状态形状：

```text
Kmem   [memory_capacity, d]
Vmem   [memory_capacity, max_answer_tokens]
length [memory_capacity]
```

### 10.2 写入过程

教师 mask 给出答案位置集合 `P`，第一个答案位置为 `first`：

```text
k = normalize(H[0, first-1, :])
a = input_ids[P]
```

`H[first-1]` 正好是模型即将预测答案第一个 token 时的隐藏状态，所以它适合作为整个问答的地址。

如果现有 key 与新 key 的余弦相似度超过 `0.999`，认为是同一个问题的重复写入并覆盖；否则追加新槽位。容量满后按环形位置复用。

### 10.3 读取过程

只在生成第一个 token 时检索：

```text
q = normalize(H[0,-1,:])
similarity = Kmem q
i* = argmax(similarity)
```

若最高相似度超过阈值：

```text
active_slot = i*
replay_step = 0
```

之后每一步不再重新选槽位：

```text
token = Vmem[active_slot, replay_step]
logits[token] += replay_bias
replay_step += 1
```

### 10.4 用示例理解

写入后可能形成：

```text
slot 12:
  key   = hidden("霁舟-17 的通行码是什么？")
  value = [苍, 羽, -, 92]
```

新问题“请告诉我霁舟-17的通行口令”若检索到 slot 12，就依次回放四个 token。

它能记住，是因为答案不再被压缩进共享矩阵；每条事实拥有独立 value。

### 10.5 为什么会误触发

槽位选择只看一个连续隐藏向量。如果问题模板相同，只把“霁舟-17”换成“霁舟-99”，两个 hidden 仍可能非常接近。一旦首步选错槽位，后续整段都锁在错误答案，无法重新判断。

30 条实验中它达到 90%，但 6 个未学习近邻全部误触发，覆盖成功只有 70%。问题已经从“存不住”转为“地址边界不精确”。

## 11. 方案八：Token kNN

### 11.1 它怎样继承并修改 KV Replay

KV Replay 的 value 是一整段答案。Token kNN 把答案拆成逐 token 转移：

```text
group 42, step 0: k0 → “苍”
group 42, step 1: k1 → “羽”
group 42, step 2: k2 → “-”
group 42, step 3: k3 → “92”
```

其中：

```text
kj = normalize(H[0, j-1, :])
vj = input_ids[j]
```

每个 transition 还保存：

```text
is_start
group_id
step_id
prompt token 指纹
context signature
entity_tag
```

### 11.2 为什么首 token 和后续 token 使用不同规则

答案首 token 的任务是确认“这是哪条事实”。后续 token 的任务是“沿已经确认的答案继续走”。把两者混在一起会造成事实串位。

首步候选必须满足：

```text
active
AND is_start
AND entity_tag 一致
AND context gate 通过
AND lexical gate 通过
```

在候选中再计算语义相似度：

```text
sim_i = key_iᵀ q0
i* = argmax(sim_i)
```

若 `sim_i* >= start_threshold`：

```text
active_group = group_id[i*]
输出 value[i*]
```

后续第 `t` 步只保留：

```text
active
AND NOT is_start
AND group_id == active_group
AND step_id == t
```

然后在这些 transition 中做 top-k 相似度加权 token 投票。

### 11.3 三种首步身份门控分别做什么

#### 实体标签

当前实现不是通用命名实体识别器。它专门针对合成数据，从问题中提取第一个：

```text
-[A-Za-z0-9]+
```

例如：

```text
霁舟-17 → 提取 "-17"
NODE-A7X → 提取 "-A7X"
```

再用 BLAKE2b 生成稳定整数标签。这样不同中文问法仍得到相同标签，而 `-17` 和 `-99` 一定不同。

这是工程门控，不是通用语义能力。自然语言实体需要更一般的实体抽取或学习型身份表示。

#### 稀有 4-token 指纹

对每个已存问题构造连续 4-token 片段。只保留在候选文档中出现次数不超过 2 的片段：

```text
rare4(prompt_i) = {g | g 是 prompt_i 的 4-gram 且 document_frequency(g) <= 2}
```

查询至少与已存问题共享两个稀有片段才通过：

```text
|rare4(prompt_i) ∩ 4gram(query)| >= 2
```

公共 chat template 和问题模板会出现在很多记录中，因此不会被当成身份特征；实体附近的稀有 token 组合更可能保留。

#### 视觉上下文签名

对于图片输入，独立生成：

```text
PIL image
 → RGB
 → resize 8×8
 → 每个通道缩放到 [-1,1]
 → flatten 为 192 维
 → L2 normalize
```

只有：

```text
stored_contextᵀ query_context >= context_threshold
```

的视觉记忆才进入语义检索。视觉实验最终使用 `0.999`。

如果查询没有图片，系统只允许匹配同样没有视觉 context 的记录，避免一句相同文字问题绕过图片要求。

### 11.4 为什么还需要隐藏状态语义检索

实体和词法门控擅长排除错误身份，但不擅长处理自由改写。隐藏状态余弦相似度负责识别：

```text
“霁舟-17 的通行码是什么？”
≈ “请告诉我霁舟-17的通行口令”
```

所以最终设计不是只用规则，也不是只用向量，而是：

```text
离散门控负责精确边界
连续 hidden 负责语义改写
group/step 负责答案连续性
```

### 11.5 覆盖旧事实为什么更安全

早期实现看到 start hidden 余弦超过 `0.999` 就删除旧 group。大批量相同模板中，不同实体 hidden 也可能超过该值，因此误删了其他事实。

现在只有先通过实体和上下文门控的候选，才有资格参与“是不是同一事实”的 start cosine 判断：

```text
same entity/context
AND start cosine > 0.999
→ 删除旧 group，再写入新轨迹
```

这把“语义相似”与“身份相同”分开了。

### 11.6 一次完整回忆示例

假设已存储 group 42：

```text
step 0 → 苍
step 1 → 羽
step 2 → -
step 3 → 92
```

用户问：“请告诉我霁舟-17的通行口令。”

第 0 步：

1. 实体标签 `-17` 一致；
2. 稀有 4-token 指纹满足交集要求；
3. 若有图片，视觉签名超过阈值；
4. start hidden 相似度超过首步阈值；
5. 锁定 `active_group=42`；
6. 给“苍”的 logit 增加偏置。

第 1 步：

1. 只看 `group=42, step=1`；
2. top-k 投票选出“羽”；
3. 给“羽”的 logit 增加偏置。

后续同理，直到答案轨迹结束。

若首步任何门控失败，插件直接返回基础 logits，不做任何修改。这是 benchmark 输出能够逐字不变的原因。

### 11.7 它为什么成功，又为什么不能叫“主干学会了”

它同时满足了四个条件：

1. 教师 token 明确作为 value 写入；
2. 每条事实有可区分地址；
3. 多 token 答案有 group 和 step；
4. 未学习输入可以拒绝。

但所有这些信息存在插件张量中，而不是 Qwen 原始 attention/MLP 权重中。删除 Safetensors 或不挂插件，记忆就消失。因此最准确的描述仍是“冻结模型上的外显在线快记忆”。

## 12. Qwen3-VL 视觉路径怎样接入

视觉实验同时有两条并行路径，不能混为一谈。

### 12.1 Qwen3-VL 正常视觉主干

图片经 processor 转成 `pixel_values`，再经过：

```text
Conv3D Patch Embed
 → learned 2D position embedding
 → axial vision RoPE
 → Vision Transformer Blocks
 → Patch Merger
 → 映射到 text hidden size
 → masked_scatter 到 image placeholder 位置
 → Text Decoder Layers
 → Final RMSNorm
 → LM Head
```

单个 Vision Block 使用 LayerNorm，而文本 Decoder 使用 RMSNorm：

```text
Z1 = Z + VisionAttention(LayerNorm1(Z), axial RoPE)
Z2 = Z1 + VisionMLP(LayerNorm2(Z1))
```

Qwen3-VL 还从若干视觉层抽取 DeepStack 特征，经额外 Patch Merger 映射到文本维度，并加到早期文本 Decoder 的视觉 token 位置。

因此 LM Head 前的文本 hidden 已经融合了图片内容。Token kNN 的语义地址并不是纯文本地址。

### 12.2 项目额外增加的 8×8 视觉签名

它不是 Qwen3-VL 视觉编码器的一部分，也不负责理解图片内容。它只用于回答：

```text
当前查询是否带了图片？
这张图片是否足够接近存储时的图片？
```

初始阈值 `0.995` 时，24 张未见图片中有 6 张误触发；升到 `0.999` 后全部拒绝，同时保留已学习图片召回。

这说明当前签名适合合成图片实例寻址，但不能证明系统学会了“红色三角形”这类视觉概念。自然图片还需要视觉 embedding、数据增强和 hard negative 校准。

## 13. 八种方法到底差在哪里

| 方法 | 写入单位 | 是否看到目标 token | 是否有事实身份 | 是否有答案顺序 | 能否拒绝未学习输入 |
|---|---|---:|---:|---:|---:|
| Residual Hebbian | 层内活动外积 | 否 | 否 | 否 | 不适用 |
| Residual Oja | 稳定化层内外积 | 否 | 否 | 否 | 不适用 |
| Vocab Hebbian | key→token 列 | 是 | 否 | 隐含在 key 中 | 弱 |
| Balanced Hebbian | 平衡后的 key→token 列 | 是 | 否 | 隐含在 key 中 | 弱 |
| Vocab Delta | 误差修正 key→token 矩阵 | 是 | 否 | 隐含在 key 中 | 弱 |
| Vocab EMA | 每 token 一个原型 | 是 | 否 | 否 | 弱 |
| KV Replay | 每问答一个整段槽位 | 是 | 有连续地址 | 整段 step | 只有余弦阈值 |
| Token kNN | 每答案 token 一个 transition | 是 | 实体/词法/视觉/语义 | group + step | 强门控拒绝 |

可以把演进路线概括为：

```text
只改变活动相关性
  ↓ 加入目标 token
能对准输出，但多个事实共享矩阵
  ↓ 增加独立槽位
能保存事实，但相似地址会误触发
  ↓ 增加身份门控与轨迹约束
同时获得召回、连续生成和拒绝能力
```

## 14. 常用配置怎样影响行为

| 配置 | 作用 | 太小 | 太大 |
|---|---|---|---|
| `rank` | 低秩快权重容量 | 表达不足 | 显存/计算和干扰上升 |
| `learning_rate` | 局部写入幅度 | 看不到作用 | 权重漂移或覆盖旧关联 |
| `adapter_strength` | 快权重对 logits/hidden 的读取强度 | 记忆压不过基础模型 | 污染无关输出 |
| `synaptic_decay` | 每次观察前的遗忘 | 旧关联长期累积 | 记忆快速消失 |
| `retrieval_threshold` | KV Replay 首地址阈值 | 误触发多 | 改写召回下降 |
| `knn_threshold` | Token kNN 首步语义阈值 | 错误事实打开 | 正确改写被拒绝 |
| `knn_continuation_threshold` | group 内后续 token 阈值 | group 内可能选错 | 答案中途停止 |
| `knn_logit_bias` | 命中 token 的额外 logit | 压不过基础模型 | 近似硬回放 |
| `knn_context_threshold` | 视觉实例拒绝阈值 | 未见图片误触发 | 同图轻微变化也可能拒绝 |

不同模型 hidden 分布不同，因此阈值不能机械复用。实验中 4B-FP8 的语义阈值需要单独校准；视觉门限也从 `0.995` 调到 `0.999`。

## 15. 三个最容易产生误解的问题

### 15.1 这是不是“在线修改 Qwen 原始权重”

不是。Qwen 原始参数冻结；动态变化发生在挂接的侧路矩阵、地址矩阵或显式记忆 buffer。它们真实参与推理，也是真正可持久化的可变状态，但不是主干权重。

### 15.2 100% 召回是否证明模型理解了事实

不能。随机密钥实验能排除预训练记忆和偶然猜测，证明插件可靠存取了问答关联；它不能证明模型形成了可迁移的抽象概念或因果知识。

### 15.3 benchmark 不下降是否证明绝对安全

不能。当前结论只适用于固定小子集。Token kNN 在这些样本上门控未命中，所以输出逐字不变；更大容量、更自然实体、更长时间运行和分布外输入仍可能暴露新的碰撞或延迟问题。

## 16. 建议的阅读顺序

如果只想理解核心机制：

1. 阅读第 1–3 节；
2. 直接阅读 KV Replay 和 Token kNN；
3. 对照 [Token kNN 网络图](diagrams/layerwise/08-token-knn-network.png)；
4. 对照 [Token kNN 公式图](diagrams/layerwise/08-token-knn-math.png)。

如果想理解为什么其他方案失败：

1. 依次阅读 Residual Hebbian → Vocab Hebbian → Vocab Delta；
2. 观察“目标 token”“事实身份”“答案顺序”“拒绝机制”是怎样逐步补齐的；
3. 再阅读 [完整实验报告](comprehensive-experiment-report.html) 中的失败过程与 benchmark 对照。

如果要继续改代码，应同时打开：

- `src/dynamic_qwen/plasticity.py`：Residual Hebbian/Oja；
- `src/dynamic_qwen/output_memory.py`：四种词表方法；
- `src/dynamic_qwen/replay_memory.py`：KV Replay；
- `src/dynamic_qwen/token_knn.py`：Token kNN；
- `src/dynamic_qwen/engine.py`：文本观察和生成生命周期；
- `src/dynamic_qwen/vision_engine.py`：视觉签名与 Qwen3-VL 生命周期。

</div>
