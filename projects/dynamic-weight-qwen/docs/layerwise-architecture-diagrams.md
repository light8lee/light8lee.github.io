---
layout: default
nav_section: projects
title: "八种动态记忆方案：网络逐层计算与底层公式"
---

> **历史教师问答协议说明：** 本文的问答示例和成绩属于旧的人工 assistant 目标写入 / 回放实验，不能作为从 user 多轮对话形成记忆的结论。新实验仅观察 user 内容，并用独立进程评估；请以 [user 对话重新实验报告](user-dialogue-experiment-report.html) 为当前结论。

<style>.experiment-document{max-width:1000px;margin:auto;line-height:1.9;overflow-wrap:anywhere}.experiment-document img{max-width:100%;height:auto}.experiment-document pre,.experiment-document table{display:block;overflow:auto}.experiment-document h2{margin-top:2.5em}.experiment-document mjx-container{max-width:100%;overflow-x:auto}</style>
<div class="experiment-document" markdown="1">

[← 返回交互实验台](../)

# 八种动态记忆方案：网络逐层计算与底层公式

这套深度图解补充了原来的模块级图。每种方法分成两张：

- **网络顺序图**：Qwen 全局路径、单个 Decoder Layer 的内部计算、插件 hook 的精确位置、一次生成调用的控制顺序；
- **公式与状态图**：读取方程、写入方程、张量形状、持久化状态、门控条件和梯度边界。

如果直接看公式仍然困难，请先阅读 [逐步文字讲解](architecture-explained-guide.html)。它用一条具体问答解释所有变量、写入过程、读取过程和失败原因。

如果要按时间顺序理解第 $t$ 次观察怎样更新插件状态、以及第 $t+1$ 次生成怎样读到该变化，请阅读 [LaTeX 推理时更新与跨次影响图解](inference-update-latex-guide.html)。

若要逐帧播放八种方法的状态变化，可打开 [动态记忆交互网页](../index.html)。

## 00. 共同骨架

![Qwen 公共骨架](diagrams/layerwise/00-qwen-common-network.png)

[SVG 源文件](diagrams/layerwise/00-qwen-common-network.svg)

## 01. Residual Hebbian

### 网络层级计算顺序

![Residual Hebbian 网络顺序](diagrams/layerwise/01-residual-hebbian-network.png)

[网络图 SVG](diagrams/layerwise/01-residual-hebbian-network.svg)

### 底层公式与状态

![Residual Hebbian 公式](diagrams/layerwise/01-residual-hebbian-math.png)

[公式图 SVG](diagrams/layerwise/01-residual-hebbian-math.svg)

## 02. Residual Oja

### 网络层级计算顺序

![Residual Oja 网络顺序](diagrams/layerwise/02-residual-oja-network.png)

[网络图 SVG](diagrams/layerwise/02-residual-oja-network.svg)

### 底层公式与状态

![Residual Oja 公式](diagrams/layerwise/02-residual-oja-math.png)

[公式图 SVG](diagrams/layerwise/02-residual-oja-math.svg)

## 03. Vocab Hebbian

### 网络层级计算顺序

![Vocab Hebbian 网络顺序](diagrams/layerwise/03-vocab-hebbian-network.png)

[网络图 SVG](diagrams/layerwise/03-vocab-hebbian-network.svg)

### 底层公式与状态

![Vocab Hebbian 公式](diagrams/layerwise/03-vocab-hebbian-math.png)

[公式图 SVG](diagrams/layerwise/03-vocab-hebbian-math.svg)

## 04. Balanced Vocab Hebbian

### 网络层级计算顺序

![Balanced Vocab Hebbian 网络顺序](diagrams/layerwise/04-vocab-hebbian-balanced-network.png)

[网络图 SVG](diagrams/layerwise/04-vocab-hebbian-balanced-network.svg)

### 底层公式与状态

![Balanced Vocab Hebbian 公式](diagrams/layerwise/04-vocab-hebbian-balanced-math.png)

[公式图 SVG](diagrams/layerwise/04-vocab-hebbian-balanced-math.svg)

## 05. Vocab Delta

### 网络层级计算顺序

![Vocab Delta 网络顺序](diagrams/layerwise/05-vocab-delta-network.png)

[网络图 SVG](diagrams/layerwise/05-vocab-delta-network.svg)

### 底层公式与状态

![Vocab Delta 公式](diagrams/layerwise/05-vocab-delta-math.png)

[公式图 SVG](diagrams/layerwise/05-vocab-delta-math.svg)

## 06. Vocab EMA

### 网络层级计算顺序

![Vocab EMA 网络顺序](diagrams/layerwise/06-vocab-ema-network.png)

[网络图 SVG](diagrams/layerwise/06-vocab-ema-network.svg)

### 底层公式与状态

![Vocab EMA 公式](diagrams/layerwise/06-vocab-ema-math.png)

[公式图 SVG](diagrams/layerwise/06-vocab-ema-math.svg)

## 07. KV Replay

### 网络层级计算顺序

![KV Replay 网络顺序](diagrams/layerwise/07-kv-replay-network.png)

[网络图 SVG](diagrams/layerwise/07-kv-replay-network.svg)

### 底层公式与状态

![KV Replay 公式](diagrams/layerwise/07-kv-replay-math.png)

[公式图 SVG](diagrams/layerwise/07-kv-replay-math.svg)

## 08. Token kNN

### 网络层级计算顺序

![Token kNN 网络顺序](diagrams/layerwise/08-token-knn-network.png)

[网络图 SVG](diagrams/layerwise/08-token-knn-network.svg)

### 底层公式与状态

![Token kNN 公式](diagrams/layerwise/08-token-knn-math.png)

[公式图 SVG](diagrams/layerwise/08-token-knn-math.svg)

## 09. Token kNN + Qwen3-VL 视觉路径

这张图单独展开视觉 Patch Embed、Vision Transformer、Patch Merger、DeepStack、文本 Decoder，以及并行的 8×8 RGB context gate。

![Token kNN Qwen3-VL 视觉路径](diagrams/layerwise/09-token-knn-vlm-network.png)

[视觉网络图 SVG](diagrams/layerwise/09-token-knn-vlm-network.svg)

## 如何阅读

先看 00 公共骨架确认两个 hook 位置，再按方法查看网络图中的红色节点。公式图按左到右依次是推理读取、观察写入、状态与边界。图中公式直接对应当前代码实现，不是对论文原图的复刻。

实现文件：`plasticity.py`、`output_memory.py`、`replay_memory.py`、`token_knn.py`、`engine.py`、`vision_engine.py`。

</div>
