from __future__ import annotations

import math
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "posts" / "llm-core-map" / "images"

W, H = 1600, 2000
VISUAL_H = 1080
PANEL_Y = 1080

BG = (247, 249, 252)
INK = (18, 24, 38)
MUTED = (104, 112, 126)
LINE = (206, 216, 230)
BLUE = (44, 104, 225)
ORANGE = (241, 108, 39)
GREEN = (44, 150, 88)
RED = (210, 62, 62)
CARD = (255, 255, 255)


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size=size, index=0)
    return ImageFont.load_default()


F_TITLE = font("title", 82)
F_SUB = font("sub", 34)
F_BODY = font("body", 43)
F_LABEL = font("label", 30)
F_SMALL = font("small", 25)
F_TERM = font("term", 31)


def line(draw: ImageDraw.ImageDraw, xy, fill=INK, width=4):
    draw.line(xy, fill=fill, width=width)


def arrow(draw: ImageDraw.ImageDraw, start, end, fill=INK, width=4):
    line(draw, [start, end], fill, width)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    size = 18
    pts = [
        end,
        (end[0] - size * math.cos(angle - 0.45), end[1] - size * math.sin(angle - 0.45)),
        (end[0] - size * math.cos(angle + 0.45), end[1] - size * math.sin(angle + 0.45)),
    ]
    draw.polygon(pts, fill=fill)


def box(draw, xy, text, outline=INK, fill=CARD, radius=14, font_obj=F_LABEL):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=4)
    x1, y1, x2, y2 = xy
    bbox = draw.textbbox((0, 0), text, font=font_obj)
    draw.text(
        ((x1 + x2 - bbox[2]) / 2, (y1 + y2 - bbox[3]) / 2 - 2),
        text,
        fill=outline,
        font=font_obj,
    )


def visual_title(draw, title, subtitle):
    draw.text((110, 72), title, fill=INK, font=F_TITLE)
    draw.line((110, 172, 820, 172), fill=INK, width=5)
    draw.text((112, 196), subtitle, fill=MUTED, font=F_SUB)


def wrap_cn(text: str, width: int) -> list[str]:
    lines: list[str] = []
    closing = "，。；：、？！）】》"
    for para in text.split("\n"):
        if not para:
            lines.append("")
            continue
        current = ""
        current_w = 0
        for ch in para:
            cw = 2 if ord(ch) > 127 else 1
            if current and current_w + cw > width:
                if ch in closing:
                    current += ch
                    lines.append(current)
                    current = ""
                    current_w = 0
                    continue
                lines.append(current)
                current = ch
                current_w = cw
            else:
                current += ch
                current_w += cw
        if current:
            lines.append(current)
    return lines


def compose_panel(draw, index: int, title: str, body: str, terms: str):
    draw.line((80, PANEL_Y, W - 80, PANEL_Y), fill=INK, width=4)
    draw.text((100, PANEL_Y + 88), title, fill=INK, font=F_TITLE)
    draw.text((104, PANEL_Y + 184), f"LLM CORE MAP / {index:03d}", fill=BLUE, font=F_SUB)
    y = PANEL_Y + 285
    for ln in wrap_cn(body, 38):
        draw.text((104, y), ln, fill=INK, font=F_BODY)
        y += 64
    draw.rounded_rectangle((100, H - 160, W - 100, H - 70), radius=8, outline=LINE, width=3, fill=CARD)
    draw.text((132, H - 135), terms, fill=(105, 113, 129), font=F_TERM)


def card(index, slug, title, body, terms, draw_visual):
    im = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(im)
    draw_visual(draw)
    compose_panel(draw, index, title, body, terms)
    path = OUT / f"{index:03d}-{slug}.png"
    im.save(path, quality=95)
    print(path)


def v01(draw):
    visual_title(draw, "大模型学习地图", "从模型内部到后训练，再到 Agent 外部循环")
    xs = [170, 455, 740, 1025, 1310]
    ys = [410, 410, 410, 410, 410]
    labels = [("Transformer", BLUE), ("RoPE", BLUE), ("Sampling", ORANGE), ("LoRA", GREEN), ("RLHF", ORANGE)]
    for i, ((label, color), x, y) in enumerate(zip(labels, xs, ys)):
        box(draw, (x, y, x + 205, y + 110), label, color)
        if i:
            arrow(draw, (xs[i - 1] + 205, y + 55), (x - 18, y + 55), fill=INK, width=3)
    box(draw, (455, 690, 740, 800), "DPO / GRPO / OPD", ORANGE)
    box(draw, (875, 690, 1160, 800), "Agent Loop", GREEN)
    arrow(draw, (1115, 520), (675, 682), fill=ORANGE)
    arrow(draw, (740, 745), (865, 745), fill=INK)
    draw.text((315, 905), "底座能力决定表达空间，后训练决定行为边界，Agent 决定外部执行。", fill=MUTED, font=F_LABEL)


def v02(draw):
    visual_title(draw, "Transformer 层", "Attention 负责上下文，FFN 负责逐 token 变换")
    box(draw, (230, 300, 510, 410), "Input Tokens", BLUE)
    box(draw, (640, 260, 980, 450), "Multi-Head\nAttention", BLUE)
    box(draw, (1110, 300, 1370, 410), "Residual + LN", GREEN)
    box(draw, (640, 610, 980, 800), "FFN\nexpand → shrink", GREEN)
    arrow(draw, (510, 355), (630, 355), BLUE)
    arrow(draw, (980, 355), (1100, 355), BLUE)
    arrow(draw, (1240, 410), (1240, 700), INK)
    arrow(draw, (1110, 700), (990, 700), INK)
    arrow(draw, (640, 700), (360, 700), GREEN)
    box(draw, (230, 650, 510, 760), "Next Layer", INK)
    draw.arc((560, 475, 1050, 920), 180, 360, fill=ORANGE, width=5)
    draw.text((585, 890), "残差像高速公路，LayerNorm 让分布稳定", fill=ORANGE, font=F_LABEL)


def v03(draw):
    visual_title(draw, "RoPE", "把位置写进 Q/K 的旋转角度里")
    cx, cy = 420, 555
    draw.ellipse((cx - 170, cy - 170, cx + 170, cy + 170), outline=LINE, width=4)
    line(draw, (cx - 210, cy, cx + 230, cy), LINE, 3)
    line(draw, (cx, cy - 210, cx, cy + 210), LINE, 3)
    arrow(draw, (cx, cy), (cx + 135, cy - 95), BLUE, 6)
    arrow(draw, (cx, cy), (cx + 65, cy + 150), ORANGE, 6)
    draw.text((310, 790), "pairwise rotation", fill=MUTED, font=F_SMALL)
    box(draw, (780, 325, 1120, 435), "q_i rotated by iθ", BLUE)
    box(draw, (780, 560, 1120, 670), "k_j rotated by jθ", ORANGE)
    box(draw, (780, 795, 1250, 905), "dot product depends on i - j", GREEN)
    arrow(draw, (950, 435), (950, 552), INK)
    arrow(draw, (950, 670), (950, 787), INK)


def v04(draw):
    visual_title(draw, "采样三旋钮", "temperature 改形状，top-k / top-p 改候选集")
    bars = [0.32, 0.22, 0.15, 0.11, 0.08, 0.05, 0.04, 0.03]
    x0, base = 180, 780
    for i, p in enumerate(bars):
        h = int(p * 1000)
        color = BLUE if i < 4 else LINE
        draw.rounded_rectangle((x0 + i * 95, base - h, x0 + i * 95 + 54, base), radius=8, fill=color)
    draw.text((170, 835), "Top-k: 固定保留前 K 个", fill=BLUE, font=F_LABEL)
    draw.arc((820, 280, 1350, 810), 20, 330, fill=ORANGE, width=24)
    draw.text((930, 510), "Top-p", fill=ORANGE, font=F_TITLE)
    draw.text((895, 620), "累计概率阈值", fill=MUTED, font=F_LABEL)
    box(draw, (430, 260, 695, 370), "τ < 1 sharper", GREEN)
    box(draw, (430, 440, 695, 550), "τ > 1 flatter", RED)


def v05(draw):
    visual_title(draw, "LoRA", "冻结大矩阵，只训练低秩旁路")
    box(draw, (220, 430, 620, 590), "Frozen W0", BLUE)
    box(draw, (830, 310, 1040, 430), "A: d → r", GREEN)
    box(draw, (1110, 310, 1320, 430), "B: r → d", GREEN)
    box(draw, (940, 635, 1240, 755), "Wnew = W0 + BA", ORANGE)
    arrow(draw, (620, 510), (820, 370), INK)
    arrow(draw, (1040, 370), (1100, 370), GREEN)
    arrow(draw, (1215, 430), (1090, 628), ORANGE)
    arrow(draw, (620, 510), (930, 690), BLUE)
    draw.text((240, 715), "训练阶段只更新 A/B；推理阶段可合并回原权重。", fill=MUTED, font=F_LABEL)


def v06(draw):
    visual_title(draw, "RLHF / PPO", "奖励模型给方向，PPO 用近端约束更新策略")
    names = [("Policy", BLUE), ("Old Policy", BLUE), ("Reward Model", ORANGE), ("Reference", GREEN), ("Critic", RED)]
    coords = [(210, 320), (680, 250), (1110, 320), (330, 700), (900, 700)]
    for (name, color), (x, y) in zip(names, coords):
        box(draw, (x, y, x + 280, y + 120), name, color)
    arrow(draw, (490, 380), (670, 320), INK)
    arrow(draw, (960, 310), (1100, 380), ORANGE)
    arrow(draw, (1215, 440), (1035, 690), ORANGE)
    arrow(draw, (470, 700), (645, 430), GREEN)
    arrow(draw, (1040, 760), (540, 430), RED)
    draw.text((470, 920), "核心成本：在线采样 + 奖励模型 + Critic + KL 约束。", fill=MUTED, font=F_LABEL)


def v07(draw):
    visual_title(draw, "DPO", "把偏好学习改写成离线分类式目标")
    box(draw, (200, 360, 520, 500), "Prompt x", BLUE)
    box(draw, (720, 270, 1110, 390), "Winner y+", GREEN)
    box(draw, (720, 590, 1110, 710), "Loser y-", RED)
    box(draw, (1130, 430, 1390, 550), "log-sigmoid", ORANGE)
    arrow(draw, (520, 430), (710, 330), INK)
    arrow(draw, (520, 430), (710, 650), INK)
    arrow(draw, (1110, 330), (1125, 465), GREEN)
    arrow(draw, (1110, 650), (1125, 515), RED)
    draw.text((270, 860), "DPO 不显式训练奖励模型或 Critic，而是用参考模型差值校准偏好强度。", fill=MUTED, font=F_LABEL)


def v08(draw):
    visual_title(draw, "GRPO", "一题多答，用组内相对奖励代替 Critic")
    box(draw, (150, 460, 410, 580), "Prompt", BLUE)
    for i in range(4):
        y = 260 + i * 170
        box(draw, (670, y, 950, y + 105), f"Answer {i + 1}", ORANGE if i != 2 else GREEN)
        arrow(draw, (410, 520), (660, y + 52), INK, 3)
        draw.text((990, y + 28), f"r{i + 1}", fill=INK, font=F_LABEL)
    box(draw, (1150, 455, 1430, 585), "group mean/std\nadvantage", GREEN)
    arrow(draw, (1045, 520), (1140, 520), GREEN)
    draw.text((260, 895), "优势来自同一 prompt 的回答组内比较，减少价值模型拟合这一层不稳定性。", fill=MUTED, font=F_LABEL)


def v09(draw):
    visual_title(draw, "On-Policy Distillation", "学生自己 rollout，老师在真实分布上批改")
    items = [("Student samples", BLUE), ("Teacher scores", ORANGE), ("Build loss", GREEN), ("Update student", RED)]
    cx, cy, r = 800, 560, 310
    points = []
    for i, (label, color) in enumerate(items):
        ang = -math.pi / 2 + i * math.pi / 2
        x = cx + int(math.cos(ang) * r)
        y = cy + int(math.sin(ang) * r)
        points.append((x, y))
        box(draw, (x - 160, y - 55, x + 160, y + 55), label, color)
    for a, b in zip(points, points[1:] + points[:1]):
        arrow(draw, a, b, INK, 3)
    draw.text((320, 940), "关键不是模仿旧数据，而是让学生暴露在自己会犯错的状态里。", fill=MUTED, font=F_LABEL)


def v10(draw):
    visual_title(draw, "Agent 外部循环", "模型从生成文本，扩展到感知、规划、记忆和行动")
    box(draw, (620, 295, 980, 415), "LLM Brain", BLUE)
    modules = [("Perception", ORANGE, 210, 525), ("Planning", GREEN, 620, 690), ("Memory", BLUE, 1030, 525), ("Action / Tools", RED, 620, 860)]
    for label, color, x, y in modules:
        box(draw, (x, y, x + 360, y + 120), label, color)
    arrow(draw, (800, 415), (390, 525), INK)
    arrow(draw, (570, 585), (620, 735), INK)
    arrow(draw, (800, 810), (800, 860), INK)
    arrow(draw, (980, 735), (1030, 585), INK)
    arrow(draw, (1210, 525), (980, 355), INK)
    draw.text((255, 1010), "可靠 Agent 的瓶颈常常不是会不会说，而是能否忠实感知、检索状态、执行并校验。", fill=MUTED, font=F_LABEL)


CARDS = [
    ("llm-learning-map", "大模型学习地图", "把这些笔记串起来，可以得到一条学习路线：先理解 Transformer 层如何处理上下文，再看 RoPE 如何注入位置；随后进入生成采样、LoRA 微调和 RLHF/DPO/GRPO/OPD 等后训练方法，最后扩展到 Agent 的感知、规划、记忆和行动循环。", "Transformer, RoPE, Sampling, LoRA, RLHF, Agent", v01),
    ("transformer-block", "Transformer 层的骨架", "一个标准层可以拆成两类主干：多头自注意力负责在 token 之间搬运上下文信息，FFN 负责对每个 token 做非线性变换；残差连接和 LayerNorm 则像稳定器，让深层网络可以持续训练。", "Attention, FFN, Residual, LayerNorm", v02),
    ("rope-relative-position", "RoPE：把距离写进内积", "RoPE 不把位置向量简单加到 token 上，而是在 Q/K 的二维子空间里按位置旋转。这样 q_i 与 k_j 的内积天然携带 i-j 的相对距离信息，更适合长序列注意力。", "RoPE, Q/K, relative position, rotation", v03),
    ("sampling-controls", "采样：三个不同旋钮", "Temperature 在 softmax 前改变概率分布的尖锐程度；Top-k 固定保留前 K 个候选；Top-p 按累计概率动态截断候选集合。实际生成质量通常来自三者组合，而不是单独迷信某个参数。", "temperature, top-k, top-p, nucleus sampling", v04),
    ("lora-low-rank", "LoRA：低秩旁路", "LoRA 假设任务适配所需的权重变化是低秩的，于是冻结原始权重 W0，只训练 A、B 两个小矩阵来近似 ΔW。训练省显存，推理时又能把 BA 合并回 W0，几乎不增加延迟。", "LoRA, rank r, alpha, target_modules", v05),
    ("rlhf-ppo-loop", "RLHF/PPO：在线奖励优化", "RLHF 的典型实现要维护策略模型、旧策略、参考模型、奖励模型和 Critic。PPO 用 clipped ratio 控制更新幅度，再用 KL 惩罚防止策略偏离参考模型太远，因此强大但工程复杂。", "RLHF, PPO, reward model, Critic, KL", v06),
    ("dpo-preference", "DPO：偏好对齐的捷径", "DPO 利用 RLHF 目标的解析形式，把“胜出回答应该比失败回答更像当前策略”直接写成离线损失。它不显式训练奖励模型和 Critic，训练更像分类问题，但依赖高质量偏好对。", "DPO, preference pair, reference model, beta", v07),
    ("grpo-group-relative", "GRPO：组内相对优势", "GRPO 对同一个 prompt 采样一组回答，用组内奖励的均值和方差归一化 advantage。它保留 PPO 风格的 ratio 和 clipping，但去掉 Critic，适合规则奖励或可验证推理场景。", "GRPO, group reward, advantage, clipping", v08),
    ("on-policy-distillation", "OPD：在学生分布上蒸馏", "On-Policy Distillation 的关键是让学生模型用当前策略自己生成样本，再由教师模型实时评分、修正或给出分布目标。它解决离线蒸馏的分布偏移和曝光偏差，但计算成本更高。", "OPD, student policy, teacher feedback, KL", v09),
    ("agent-loop", "Agent：从模型到行动系统", "Agent 把大模型放进外部循环：感知模块读取环境，规划模块拆任务，记忆模块保存状态，行动模块调用工具。真正的可靠性来自闭环校验，而不只是模型单次回答的漂亮程度。", "Agent, perception, planning, memory, tools", v10),
]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for i, (slug, title, body, terms, visual) in enumerate(CARDS, 1):
        card(i, slug, title, body, terms, visual)


if __name__ == "__main__":
    main()
