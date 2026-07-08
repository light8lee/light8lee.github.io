from __future__ import annotations

import re
import shutil
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\BaiduSyncdisk\knowledge\大模型")
POSTS = ROOT / "_posts"
ASSETS = ROOT / "assets" / "posts" / "llm-notes"
COLLECTION_NAME = "大模型基础知识"


@dataclass(frozen=True)
class SourcePost:
    filename: str
    slug: str
    title: str
    summary: str
    tags: list[str]


POSTS_TO_BUILD = [
    SourcePost(
        "Transformer详解.md",
        "transformer",
        "Transformer 详解：从 Attention 到 FFN、残差与 LayerNorm",
        "完整整理 Transformer 层的核心组件、PyTorch 实现、FFN 膨胀收缩结构，以及 MoE、GQA 等延伸问题。",
        ["LLM", "Transformer", "Attention", "FFN"],
    ),
    SourcePost(
        "Rope.md",
        "rope",
        "RoPE 详解：旋转位置编码如何把相对距离写进注意力",
        "完整整理 RoPE 的目标、二维旋转推导、高维推广、PyTorch 实现和频率设计直觉。",
        ["LLM", "RoPE", "position encoding", "Attention"],
    ),
    SourcePost(
        "top_p、top_k和temperature.md",
        "sampling",
        "Top-p、Top-k 与 Temperature：大模型生成采样参数详解",
        "完整整理 temperature、top-k、top-p 的作用阶段、数学含义、优缺点、组合方式和 PyTorch 示例。",
        ["LLM", "decoding", "sampling", "temperature"],
    ),
    SourcePost(
        "Lora.md",
        "lora",
        "LoRA 详解：低秩适配如何降低大模型微调成本",
        "完整整理 LoRA 的低秩旁路原理、训练与推理合并、注入位置、关键参数、调优策略和扩展变体。",
        ["LLM", "LoRA", "fine-tuning", "PEFT"],
    ),
    SourcePost(
        "PPO、DPO、GRPO详解.md",
        "ppo-dpo-grpo",
        "PPO、DPO、GRPO 详解：LLM 偏好对齐方法对比",
        "完整整理 RLHF/PPO、DPO、GRPO 的数学目标、训练流程、代码示例和方法差异。",
        ["LLM", "RLHF", "PPO", "DPO", "GRPO"],
    ),
    SourcePost(
        "GRPO_PyTorch_伪代码详解.md",
        "grpo-pytorch",
        "GRPO PyTorch 伪代码详解：从组内优势到 masked token loss",
        "完整整理 GRPO 的张量形状、log probability 提取、ratio、clipping、KL penalty、detach 与 mask 细节。",
        ["LLM", "GRPO", "PyTorch", "RL"],
    ),
    SourcePost(
        "On Policy Distillaion(OPD).md",
        "opd",
        "On-Policy Distillation 详解：在学生自己的分布上蒸馏",
        "完整整理 OPD 的定义、LLM 需要它的原因、算法流程、和 RLHF/DPO/SDPO 的关系及优缺点。",
        ["LLM", "distillation", "OPD", "post-training"],
    ),
    SourcePost(
        "Agent.md",
        "agent",
        "AI Agent 详解：感知、规划、记忆与行动的系统架构",
        "完整整理 AI Agent 的四模块架构、感知、规划推理、记忆、行动工具以及关键论文资源。",
        ["LLM", "Agent", "planning", "memory", "tools"],
    ),
    SourcePost(
        "图解大模型RLHF系列之：人人都能看懂的PPO原理与源码解读 - 知乎.pdf",
        "ppo-source-walkthrough",
        "图解大模型 RLHF：PPO 原理与源码解读",
        "从原始 PDF 提取整理 PPO 原理与源码解读内容，并搭配生成式配图作为网页阅读版。",
        ["LLM", "RLHF", "PPO", "source walkthrough"],
    ),
]


def yaml_string(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def split_frontmatter(text: str) -> tuple[str | None, str]:
    if not text.startswith("---\n"):
        return None, text
    end = text.find("\n---", 4)
    if end == -1:
        return None, text
    return text[4:end].strip(), text[end + len("\n---") :].lstrip()


def normalize_obsidian(text: str) -> str:
    text = text.replace("\r\n", "\n")
    text = re.sub(r"!\[\[([^\]]+)\]\]", r"\n> 原文图片占位：`\1`\n", text)

    def wiki_link(match: re.Match[str]) -> str:
        target = match.group(1)
        if "|" in target:
            return target.split("|", 1)[1]
        return target

    text = re.sub(r"\[\[([^\]]+)\]\]", wiki_link, text)
    text = re.sub(r"^> \[!(\w+)\]\s*(.*)$", r"> **\1** \2", text, flags=re.MULTILINE)
    text = text.replace("```handdrawn-ink", "```json")
    return text.strip() + "\n"


def read_markdown(path: Path) -> str:
    text = path.read_text(encoding="utf-8-sig")
    frontmatter, body = split_frontmatter(text)
    body = normalize_obsidian(body)
    if not frontmatter:
        return body
    return (
        "## 原始笔记元数据\n\n"
        "```yaml\n"
        f"{frontmatter}\n"
        "```\n\n"
        f"{body}"
    )


def read_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    chunks: list[str] = []
    for index, page in enumerate(reader.pages, 1):
        text = page.extract_text() or ""
        text = re.sub(r"[ \t]+\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text.strip())
        if text:
            chunks.append(f"## PDF 第 {index} 页\n\n{text}")
    return "\n\n".join(chunks).strip() + "\n"


def source_body(post: SourcePost) -> str:
    path = SOURCE / post.filename
    if path.suffix.lower() == ".pdf":
        return read_pdf(path)
    return read_markdown(path)


def post_markdown(post: SourcePost, date: datetime) -> str:
    cover = f"/assets/posts/llm-notes/{post.slug}/images/cover.png"
    src_path = SOURCE / post.filename
    body = source_body(post)
    return f"""---
layout: post
title: {yaml_string(post.title)}
date: {date.strftime("%Y-%m-%d %H:%M:%S")} +0800
summary: {yaml_string(post.summary)}
tags: [{", ".join(post.tags)}]
category: {yaml_string(COLLECTION_NAME)}
cover: {cover}
---

<figure class="source-cover">
  <img src="{{{{ '{cover}' | relative_url }}}}" alt="{post.title}" loading="lazy">
  <figcaption>Imagen 生成配图，基于原始文件《{src_path.name}》的主题绘制。</figcaption>
</figure>

> 原始文件：`{src_path}`  
> 说明：下面正文尽量保留原始笔记的完整内容；Obsidian 本地图片引用会以“原文图片占位”形式保留，避免网页出现断图。

{body}
"""


def main() -> None:
    # Remove the previous aggregate article/assets that did not match the requested publishing shape.
    aggregate_post = POSTS / "2026-07-07-llm-core-map.md"
    if aggregate_post.exists():
        aggregate_post.unlink()
    aggregate_assets = ROOT / "assets" / "posts" / "llm-core-map"
    if aggregate_assets.exists():
        shutil.rmtree(aggregate_assets)
    aggregate_script = ROOT / "scripts" / "generate_llm_core_map_cards.py"
    if aggregate_script.exists():
        aggregate_script.unlink()

    base_date = datetime(2026, 7, 8, 9, 30)
    for offset, post in enumerate(POSTS_TO_BUILD):
        out = POSTS / f"{base_date.date()}-{post.slug}.md"
        out.write_text(post_markdown(post, base_date + timedelta(minutes=offset)), encoding="utf-8")
        print(out)


if __name__ == "__main__":
    main()
