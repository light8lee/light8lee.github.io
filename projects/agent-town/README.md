# 小城应急局 / Agent Town

一个可以观察、复现和回放 multi-agent 协作过程的像素城市模拟器。

当前版本无需模型或 API Key：场景、Agent 特质和动态事件都由可复现的随机种子生成。浏览器内置三类任务：暴雨应急、城市停电和活动保障。

一条 trajectory 会依次穿过四个可以展开查看的城市子场景：

1. 城市会商室通过 Group Chat 形成 `emergency-plan.ready`。
2. 应急指挥中心通过 Supervisor 发布 `supply.request`。
3. 物资仓储中心通过 Event Bus 产生 `supplies.ready`。
4. 能源站按照 DAG SOP 产生 `power.ready`，结果回流指挥中心。

## 本地运行

需要 Node.js 22.13 或更新版本。

```bash
npm install
npm run dev
```

打开终端给出的本地地址。点击“生成新事件”会创建新的 Seed；复制右上角链接可以复现同一条 trajectory。

## 当前协作协议

- `GROUP CHAT`：短会商与主持人轮次控制
- `SUPERVISOR`：任务拆解、委派和动态重规划
- `DAG`：并行节点、依赖与汇合
- `EVENT BUS`：状态广播与松耦合消费
- `WORLD EVENT`：由当前世界条件触发的动态分支

## 模型接入路线

运行层将支持三种可替换的 Provider：

1. 浏览器规则模拟，用于公开 Demo 和离线回放。
2. 本地 OpenAI-compatible 服务，用于 LM Studio、Ollama 等本地推理。
3. 云端 OpenAI-compatible API，用于需要更强规划与文本质量的运行。

所有 Provider 最终都写入同一种 trajectory 事件格式。API Key 只保存在本地运行端，不进入浏览器构建或公开轨迹。
