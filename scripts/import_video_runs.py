from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VIDEO_ROOT = Path(r"D:\Codex\Video")
POSTS_DIR = ROOT / "_posts"
ASSETS_DIR = ROOT / "assets" / "posts" / "video-notes"
REWARD_HACKING_RUN = VIDEO_ROOT / ".worktrees" / "reward-hacking-2026-06-20" / "run-2026-06-20-reward-hacking"
CODEX_CH03_PUBLISH = (
    VIDEO_ROOT
    / ".worktrees"
    / "dive-into-codex-images"
    / "dive-into-codex"
    / "publish"
    / "chapters"
    / "03-cache-and-compaction"
)
CODEX_CH08_PUBLISH = (
    VIDEO_ROOT
    / ".worktrees"
    / "dive-into-codex-images"
    / "dive-into-codex"
    / "publish"
    / "chapters"
    / "08-system-instructions-constraints"
)

SKIP_RUNS = {
    # These have hand-edited long-form posts already in the site.
    "run-2026-07-04-codex-ch01",
    "run-2026-07-05-codex-ch02",
    "run-20260706-codex-ch02",
    # Duplicate backup directory with the same Cherrl material.
    "run-2026-06-21-cherrl - 副本",
    # User requested SCPO material be skipped.
    "run-2026-07-01-scpo",
    "run-2026-07-03-scpo-xhs",
}

RUN_OVERRIDES = {
    "run-20260706-codex-ch03": {
        "slug": "dive-into-codex-03-cache-compaction",
        "asset_slug": "dive-into-codex-03-cache-compaction",
        "title": "Dive into Codex 03：Cache 与 Compaction",
        "summary": "继续看 Codex 长任务里的上下文管理：稳定前缀如何帮助 prompt cache，compaction 如何在窗口压力下保留可继续工作的状态。",
        "category": "Codex",
        "tags": ["Codex", "coding agent", "visual-essay", "source-notes", "cache", "compaction"],
        "publish_chapter_dir": str(CODEX_CH03_PUBLISH),
    },
    "08-system-instructions-constraints": {
        "slug": "dive-into-codex-08-system-instructions-constraints",
        "asset_slug": "dive-into-codex-08-system-instructions-constraints",
        "title": "Dive into Codex 08：System 指令与运行约束",
        "summary": "从 Codex 源码中的系统级指令出发，理解它如何以指令层级、工作区保护、工具纪律、权限边界和验证契约，约束一个可协作、可执行的本地 coding agent。",
        "date": "2026-07-11 14:00:00 +0800",
        "category": "Codex",
        "tags": ["Codex", "coding agent", "visual-essay", "source-notes", "system-instructions", "constraints"],
        "publish_chapter_dir": str(CODEX_CH08_PUBLISH),
    },
    "run-2026-06-20-reward-hacking": {
        "title": "奖励上涨，为什么安全目标反而变差？",
        "summary": "训练中观察奖励不断上涨，隐藏的真实目标，也就是安全表现，却可能原地踏步，甚至变差。风险是我们把钻空子误判成能力提升。",
        "category": "LLM Post-training",
        "tags": ["video-notes", "visual-essay", "LLM post-training", "reward hacking", "Agent RL"],
        "evidence_file": "evidence.md",
    }
}

EXTRA_RUN_DIRS = [
    REWARD_HACKING_RUN,
]


@dataclass
class Scene:
    index: int
    title: str
    body: str
    image: Path | None


@dataclass
class PublishedChapter:
    intro: str
    mainline: str
    scenes: list[Scene]
    tail: str
    source_images: list[Path]


def run_powershell(script: str) -> str:
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", script],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return result.stdout.strip()


def get_creation_time(path: Path) -> datetime:
    escaped = str(path).replace("'", "''")
    value = run_powershell(
        f"(Get-Item -LiteralPath '{escaped}').CreationTime.ToString('yyyy-MM-ddTHH:mm:sszzz')"
    )
    return datetime.fromisoformat(value)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig").replace("\r\n", "\n")


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"^run-", "", value)
    value = re.sub(r"^\d{4}-\d{2}-\d{2}-", "", value)
    value = re.sub(r"^\d{8}-", "", value)
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return re.sub(r"-+", "-", value).strip("-")


def run_slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"^run-", "", value)
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return re.sub(r"-+", "-", value).strip("-")


def yaml_quote(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def markdown_escape_html(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def normalize_published_links(value: str) -> str:
    return (
        value.replace("[Subagent 架构](../07-subagent-architecture/)", "Subagent 架构（待发布）")
        .replace("[Dive into Codex](../../README.md)", "Dive into Codex 系列")
    )


def split_chapter_connection(value: str) -> tuple[str, str]:
    marker = "\n## 章节衔接\n"
    content, separator, connection = value.partition(marker)
    if not separator:
        return value, ""
    return content.rstrip(), "## 章节衔接\n\n" + connection.strip()


def choose_video_time(run_dir: Path) -> datetime:
    mp4s = [p for p in run_dir.glob("*.mp4") if p.stat().st_size > 0]
    finals = [p for p in mp4s if "final" in p.name.lower()]
    candidates = finals or sorted(mp4s, key=lambda p: p.stat().st_size, reverse=True)
    return get_creation_time(candidates[0] if candidates else run_dir)


def choose_image_dir(run_dir: Path) -> Path | None:
    for name in ("cards", "final", "source-images"):
        image_dir = run_dir / name
        if image_dir.exists() and any(image_dir.glob("*.png")):
            return image_dir
    return None


def image_sort_key(path: Path) -> tuple[int, str]:
    match = re.search(r"(\d+)", path.stem)
    return (int(match.group(1)) if match else 9999, path.name)


def load_sources(run_dir: Path) -> list[dict]:
    path = run_dir / "sources.json"
    if not path.exists():
        return []
    try:
        data = json.loads(read_text(path))
        return data if isinstance(data, list) else [data]
    except json.JSONDecodeError:
        return []


def first_heading(script: str, fallback: str) -> str:
    for line in script.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return fallback


def has_cjk(value: str) -> bool:
    return bool(re.search(r"[\u4e00-\u9fff]", value))


def display_title(script: str, sources: list[dict], slug: str) -> str:
    heading = first_heading(script, slug.replace("-", " "))
    if "SCPO" in heading:
        return "SCPO：从失败轨迹里找回正确步骤"
    if "Yuvion" in heading:
        return "Yuvion LLM：把对抗鲁棒性放进安全模型训练"
    if not re.search(r"视频脚本|图文脚本|Agent 视频脚本", heading):
        return heading
    topic = next((str(s.get("topic")) for s in sources if s.get("topic") and has_cjk(str(s.get("topic")))), "")
    if topic:
        return topic
    source_title = next((str(s.get("title")) for s in sources if s.get("title")), "")
    return source_title or heading


def display_summary(run_dir: Path, script: str, sources: list[dict], title: str) -> str:
    paragraphs = split_plain_script(script)
    for paragraph in paragraphs:
        cleaned = re.sub(r"\s+", " ", paragraph).strip()
        if len(cleaned) > 20 and has_cjk(cleaned) and "技术要点" not in cleaned:
            return cleaned[:180]
    for _, scene_body in parse_scene_data(run_dir):
        cleaned = re.sub(r"\s+", " ", scene_body).strip()
        if len(cleaned) > 20 and has_cjk(cleaned):
            return cleaned[:180]
    topic = next((str(s.get("topic")) for s in sources if s.get("topic")), "")
    if topic:
        return re.sub(r"\s+", " ", topic).strip()[:180]
    source_summary = next((str(s.get("summary")) for s in sources if s.get("summary")), "")
    return re.sub(r"\s+", " ", source_summary or title).strip()[:180]


def parse_storyboard(run_dir: Path) -> list[str]:
    path = run_dir / "storyboard.md"
    if not path.exists():
        return []
    items: list[str] = []
    for line in read_text(path).splitlines():
        match = re.match(r"\s*\d+[.)]\s*(.+)", line)
        if match:
            items.append(match.group(1).strip())
    return items


def split_plain_script(script: str) -> list[str]:
    lines = []
    skip_section = False
    for raw in script.splitlines():
        line = raw.strip()
        if not line:
            lines.append("")
            continue
        if line.startswith("# "):
            continue
        if line.startswith("## 发布文案"):
            skip_section = True
            continue
        if skip_section:
            continue
        lines.append(raw)
    blocks = [b.strip() for b in "\n".join(lines).split("\n\n") if b.strip()]
    return [
        b
        for b in blocks
        if not b.startswith("## ")
        and not b.lstrip().startswith("|")
        and not b.lstrip().startswith("- ")
        and not re.match(r"^\d+[.)]\s", b.lstrip())
    ]


def parse_numbered_sections(script: str) -> list[tuple[str, str]]:
    matches = list(re.finditer(r"^##\s+(\d{1,2})\s+(.+)$", script, re.M))
    sections: list[tuple[str, str]] = []
    for idx, match in enumerate(matches):
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(script)
        title = match.group(2).strip()
        body = script[start:end].strip()
        body = re.split(r"^发布标题建议：|^正文开头建议：|^参考来源：", body, flags=re.M)[0].strip()
        sections.append((title, body))
    return sections


def parse_scene_data(run_dir: Path) -> list[tuple[str, str]]:
    path = run_dir / "scene_data.json"
    if not path.exists():
        return []
    try:
        data = json.loads(read_text(path))
    except json.JSONDecodeError:
        return []
    scenes = data.get("scenes", data) if isinstance(data, dict) else data
    if not isinstance(scenes, list):
        return []
    parsed: list[tuple[str, str]] = []
    for scene in scenes:
        if not isinstance(scene, dict):
            continue
        title = str(scene.get("title") or scene.get("heading") or scene.get("name") or "Scene").strip()
        body = str(
            scene.get("narration")
            or scene.get("script")
            or scene.get("voiceover")
            or scene.get("body")
            or scene.get("text")
            or ""
        ).strip()
        parsed.append((title, body))
    return parsed


def build_scenes(run_dir: Path, images: list[Path], script: str) -> list[Scene]:
    sections = parse_numbered_sections(script)
    if not sections:
        sections = parse_scene_data(run_dir)
    storyboard = parse_storyboard(run_dir)
    paragraphs = split_plain_script(script)

    count = max(len(images), len(sections), len(storyboard), 1)
    scenes: list[Scene] = []
    for idx in range(count):
        title = ""
        body = ""
        if idx < len(sections):
            title, body = sections[idx]
        elif idx < len(storyboard):
            title = storyboard[idx]
        else:
            title = f"Scene {idx + 1:02d}"

        if not body:
            if idx < len(paragraphs):
                body = paragraphs[idx]
            elif idx == 0 and paragraphs:
                body = "\n\n".join(paragraphs[:3])
            else:
                body = "这一页来自原视频素材卡片，保留原分镜顺序用于网页归档。"

        scenes.append(
            Scene(
                index=idx + 1,
                title=title,
                body=body,
                image=images[idx] if idx < len(images) else None,
            )
        )
    return scenes


def source_links_html(sources: list[dict]) -> str:
    links = []
    for item in sources:
        url = item.get("canonical_url") or item.get("url")
        title = item.get("title") or item.get("platform") or url
        if url:
            links.append(f'  <a href="{markdown_escape_html(str(url))}">{markdown_escape_html(str(title))}</a>')
    if not links:
        return ""
    return '<div class="source-list">\n' + "\n".join(links) + "\n</div>\n\n"


def parse_publish_chapter(chapter_dir: Path) -> PublishedChapter:
    readme = read_text(chapter_dir / "README.md")
    section_matches = list(re.finditer(r"^##\s+(\d{3})\.\s+(.+)$", readme, re.M))
    first_section_start = section_matches[0].start() if section_matches else len(readme)
    prelude = readme[:first_section_start].strip()
    prelude = re.sub(r"^# .+\n*", "", prelude).strip()

    tail_start = len(readme)
    official = re.search(r"^##\s+官方依据\s*$", readme, re.M)
    if official:
        tail_start = official.start()

    mainline_match = re.search(r"本章主线：\n\n```text\n(.*?)\n```", prelude, re.S)
    mainline = mainline_match.group(1).strip() if mainline_match else ""
    intro = re.sub(r"本章主线：\n\n```text\n.*?\n```", "", prelude, flags=re.S).strip()

    scenes: list[Scene] = []
    source_images: list[Path] = []
    for idx, match in enumerate(section_matches):
        start = match.end()
        next_start = section_matches[idx + 1].start() if idx + 1 < len(section_matches) else tail_start
        chunk = readme[start:next_start].strip()
        image_match = re.search(r"!\[[^\]]*\]\((images/[^)]+)\)", chunk)
        image_path = chapter_dir / image_match.group(1) if image_match else None
        if image_path:
            source_images.append(image_path)
            chunk = chunk.replace(image_match.group(0), "").strip()
        scenes.append(
            Scene(
                index=int(match.group(1)),
                title=match.group(2).strip(),
                body=chunk.strip(),
                image=image_path,
            )
        )

    tail = readme[tail_start:].strip() if tail_start < len(readme) else ""
    return PublishedChapter(
        intro=intro,
        mainline=mainline,
        scenes=scenes,
        tail=tail,
        source_images=source_images,
    )


def evidence_summary(run_dir: Path, evidence_name: str) -> str:
    path = run_dir / evidence_name
    if not path.exists():
        return ""
    text = read_text(path)
    wanted = []
    capture = False
    for line in text.splitlines():
        if line.startswith("## 证据边界") or line.startswith("## 九、可追溯来源"):
            capture = True
            wanted.append("#" + line)
            continue
        if line.startswith("## ") and capture:
            capture = False
        if capture:
            wanted.append(line)
    return "\n".join(wanted).strip()


def write_post(run_dir: Path, dry_run: bool = False) -> Path | None:
    if run_dir.name in SKIP_RUNS:
        return None
    script_path = run_dir / "script.md"
    script = read_text(script_path) if script_path.exists() else ""
    override = RUN_OVERRIDES.get(run_dir.name, {})
    if not script and not (run_dir / "scene_data.json").exists() and not override.get("publish_chapter_dir"):
        return None

    slug = slugify(run_dir.name)
    asset_slug = run_slugify(run_dir.name)
    slug = str(override.get("slug", slug))
    asset_slug = str(override.get("asset_slug", asset_slug))
    video_time = choose_video_time(run_dir)
    sources = load_sources(run_dir)
    title = str(override.get("title") or display_title(script, sources, slug))
    summary = str(override.get("summary") or display_summary(run_dir, script, sources, title))
    publish_chapter = None
    if override.get("publish_chapter_dir"):
        publish_chapter = parse_publish_chapter(Path(str(override["publish_chapter_dir"])))

    image_dir = choose_image_dir(run_dir)
    source_images = (
        publish_chapter.source_images
        if publish_chapter
        else sorted(image_dir.glob("*.png"), key=image_sort_key) if image_dir else []
    )
    asset_dir = ASSETS_DIR / asset_slug / "images"
    copied_images: list[Path] = []
    if not dry_run:
        if asset_dir.exists():
            shutil.rmtree(asset_dir)
        asset_dir.mkdir(parents=True, exist_ok=True)
    for image in source_images:
        dest_name = image.name
        if image_dir and image_dir.name == "final" and not publish_chapter:
            match = re.search(r"(\d+)", image.stem)
            dest_name = f"{int(match.group(1)):02d}.png" if match else image.name
        dest = asset_dir / dest_name
        if not dry_run:
            shutil.copy2(image, dest)
        copied_images.append(dest)

    if publish_chapter:
        scenes = [
            Scene(scene.index, scene.title, scene.body, copied_images[idx] if idx < len(copied_images) else None)
            for idx, scene in enumerate(publish_chapter.scenes)
        ]
    else:
        scenes = build_scenes(run_dir, copied_images, script)
    cover = f"/assets/posts/video-notes/{asset_slug}/images/{copied_images[0].name}" if copied_images else ""
    date_value = str(override.get("date") or video_time.strftime("%Y-%m-%d %H:%M:%S +0800"))
    post_name = f"{date_value[:10]}-{slug}.md"
    post_path = POSTS_DIR / post_name

    category = str(override.get("category") or ("Agent" if any(s.get("theme") == "agent" for s in sources) else "AI Notes"))
    tags = list(override.get("tags") or ["video-notes", "visual-essay"])
    if any(s.get("theme") == "llm-post-training" for s in sources):
        if "LLM post-training" not in tags:
            tags.append("LLM post-training")
        category = "LLM Post-training"
    if "codex" in slug:
        if "Codex" not in tags:
            tags.append("Codex")
        category = "Codex"
    tags = list(dict.fromkeys(tags))

    body = [
        "---",
        "layout: post",
        f"title: {yaml_quote(title)}",
        f"date: {date_value}",
        f"summary: {yaml_quote(summary)}",
        "tags: [" + ", ".join(tags) + "]",
        f"category: {category}",
    ]
    if cover:
        body.append(f"cover: {cover}")
    body.extend(["body_class: dive-into-codex-post", "---", ""])

    intro = publish_chapter.intro if publish_chapter else summary.rstrip("。") + "。"
    body.extend([intro, ""])
    if publish_chapter and publish_chapter.mainline:
        body.extend(["本章主线：", "", "```text", publish_chapter.mainline, "```", ""])
    body.extend([source_links_html(sources).rstrip(), ""])

    for scene in scenes:
        scene_body, chapter_connection = split_chapter_connection(scene.body.strip())
        image_name = scene.image.name if scene.image else ""
        image_src = f"/assets/posts/video-notes/{asset_slug}/images/{image_name}"
        body.extend(['<section class="visual-note" markdown="1">'])
        if image_name:
            body.extend(
                [
                    "<figure>",
                    f'<img src="{{{{ \'{image_src}\' | relative_url }}}}" alt="{markdown_escape_html(scene.title)}" loading="lazy">',
                    "</figure>",
                ]
            )
        body.extend(
            [
                '<div markdown="1">',
                f'<p class="visual-note-index">{scene.index:03d} / {"Dive into Codex" if category == "Codex" else "Video Notes"}</p>',
                f"<h2>{markdown_escape_html(scene.title)}</h2>",
                "",
                normalize_published_links(scene_body),
                "</div>",
                "</section>",
                "",
            ]
        )
        if chapter_connection:
            body.extend(
                [
                    '<section class="chapter-connection" markdown="1">',
                    "",
                    normalize_published_links(chapter_connection),
                    "",
                    "</section>",
                    "",
                ]
            )

    if publish_chapter and publish_chapter.tail:
        body.extend([publish_chapter.tail, ""])

    if override.get("evidence_file"):
        evidence = evidence_summary(run_dir, str(override["evidence_file"]))
        if evidence:
            body.extend(["## 证据与制作边界", "", evidence, ""])

    if not dry_run:
        post_path.write_text("\n".join(body).replace("\n\n\n", "\n\n"), encoding="utf-8")
    return post_path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    generated = []
    run_dirs = list(VIDEO_ROOT.glob("run-*")) + [p for p in EXTRA_RUN_DIRS if p.exists()]
    if CODEX_CH08_PUBLISH.exists():
        run_dirs.append(CODEX_CH08_PUBLISH)
    for run_dir in sorted(run_dirs, key=get_creation_time):
        post = write_post(run_dir, dry_run=args.dry_run)
        if post:
            generated.append(post)
    for post in generated:
        print(post.relative_to(ROOT))
    print(f"generated={len(generated)}")


if __name__ == "__main__":
    main()
