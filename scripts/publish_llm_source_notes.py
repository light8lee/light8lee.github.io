from __future__ import annotations

import os
import re
import shutil
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ.get("LLM_NOTES_SOURCE", ROOT / ".source_llm_notes"))
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
        "top_p、top_k 和 temperature：大模型采样参数详解",
        "系统整理 temperature、top-k、top-p 的数学含义、直觉差异、组合方式和典型场景。",
        ["LLM", "decoding", "sampling", "temperature"],
    ),
    SourcePost(
        "Lora.md",
        "lora",
        "LoRA 详解：低秩适配如何高效微调大模型",
        "完整整理 LoRA 的直觉、低秩分解公式、训练与推理合并、PyTorch 实现、Rank 选择和工程要点。",
        ["LLM", "LoRA", "fine-tuning", "PEFT"],
    ),
    SourcePost(
        "PPO、DPO、GRPO详解.md",
        "ppo-dpo-grpo",
        "PPO、DPO、GRPO 详解：LLM 偏好对齐方法对比",
        "完整整理 PPO、DPO、GRPO 的目标函数、训练流程、优缺点和适用场景。",
        ["LLM", "RLHF", "PPO", "DPO", "GRPO"],
    ),
    SourcePost(
        "GRPO_PyTorch_伪代码详解.md",
        "grpo-pytorch",
        "GRPO PyTorch 伪代码详解：从采样到组内相对优势",
        "结合伪代码完整拆解 GRPO 的 rollout、reward、group advantage、loss 和训练循环。",
        ["LLM", "GRPO", "PyTorch", "RL"],
    ),
    SourcePost(
        "On Policy Distillaion(OPD).md",
        "opd",
        "On-Policy Distillation：让学生在自己的分布上学习",
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
    text = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", text)
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"^> \[!([^\]]+)\][+-]?", r"> **\1**", text, flags=re.MULTILINE)
    text = text.replace("```handdrawn-ink", "```json")
    return text.strip() + "\n"


def markdown_heading_from_title(title: str) -> str:
    title = title.strip()
    if not title:
        return ""
    return "# " + title.lstrip("#").strip()


def read_markdown(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    frontmatter, body = split_frontmatter(text)
    body = normalize_obsidian(body)
    if frontmatter:
        body = (
            "## 原始笔记元数据\n\n"
            "```yaml\n"
            f"{frontmatter}\n"
            "```\n\n"
            f"{body}"
        )
    first_line = body.lstrip().splitlines()[0] if body.strip() else ""
    if first_line.startswith("# "):
        return body
    title = path.stem.replace("_", " ")
    return markdown_heading_from_title(title) + "\n\n" + body


def source_body(post: SourcePost) -> str:
    return read_markdown(SOURCE / post.filename)


def post_markdown(post: SourcePost, date: datetime) -> str:
    cover = f"/assets/posts/llm-notes/{post.slug}/images/cover.png"
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
  <figcaption>Imagen 生成配图，基于本文主题绘制。</figcaption>
</figure>

{body}
"""


def remove_path(path: Path) -> None:
    if path.is_dir():
        shutil.rmtree(path)
    elif path.exists():
        path.unlink()


def main() -> None:
    remove_path(POSTS / "2026-07-07-llm-core-map.md")
    remove_path(ROOT / "assets" / "posts" / "llm-core-map")
    remove_path(ROOT / "scripts" / "generate_llm_core_map_cards.py")
    remove_path(POSTS / "2026-07-08-ppo-source-walkthrough.md")
    remove_path(ASSETS / "ppo-source-walkthrough")

    base_date = datetime(2026, 7, 8, 9, 30)
    for offset, post in enumerate(POSTS_TO_BUILD):
        out = POSTS / f"{base_date.date()}-{post.slug}.md"
        out.write_text(post_markdown(post, base_date + timedelta(minutes=offset)), encoding="utf-8")
        print(out)


if __name__ == "__main__":
    main()
