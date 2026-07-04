# Personal Homepage Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the old Jekyll GitHub Pages site into a modern personal homepage/blog for `https://light8lee.github.io/`, with imported SCPO image-series content and static animation support.

**Architecture:** Keep Jekyll because the repository already uses it and GitHub Pages supports it directly. Replace the old domain-bound theme with small layouts/includes, root-safe links, modern CSS, static content assets, and one lightweight JavaScript animation module.

**Tech Stack:** Jekyll, Liquid templates, Markdown posts/pages, vanilla CSS, vanilla JavaScript, PowerShell verification commands.

---

## File Structure

- Modify `_config.yml`: site metadata, root URL, navigation, markdown settings, GitHub Pages-compatible plugin key.
- Delete `CNAME`: removes old `light8lee.pub` binding.
- Modify `index.html`: new personal homepage using Jekyll collections/posts.
- Modify `_layouts/default.html`: shared HTML shell with modern header/footer and no obsolete external scripts.
- Modify `_layouts/post.html`: readable post layout with metadata, tags, and optional references.
- Create `_includes/site-header.html`: navigation and brand header.
- Create `_includes/site-footer.html`: footer and source links.
- Create `_includes/post-card.html`: reusable list item for posts/projects.
- Create `css/main.css`: new visual system and responsive layout.
- Create `assets/js/animations/home-constellation.js`: lightweight canvas animation for homepage.
- Create `assets/posts/scpo/final/`: imported final PNG sequence.
- Create `assets/posts/scpo/notes/`: imported source Markdown/revision files.
- Create `_posts/2026-07-04-scpo-semantic-consistency-policy-optimization.md`: initialized SCPO post.
- Modify `about.html`, `archives.html`, `categories.html`, `links.html`: make legacy pages use the new layout and root-safe URLs.
- Create `pages/projects.html`: current projects/visual essays page.
- Create `pages/notes.html`: notes index page.
- Modify `README.md`: document local build and migration to `light8lee.github.io`.

## Task 1: Link and Config Foundation

**Files:**
- Modify: `_config.yml`
- Delete: `CNAME`
- Modify: `README.md`

- [ ] **Step 1: Write failing configuration checks**

Create a temporary verification command that should fail before config changes:

```powershell
@'
from pathlib import Path
config = Path("_config.yml").read_text(encoding="utf-8")
assert "url: https://light8lee.github.io" in config
assert 'baseurl: ""' in config
assert "plugins:" in config
assert "gems:" not in config
assert not Path("CNAME").exists()
readme = Path("README.md").read_text(encoding="utf-8")
assert "light8lee.github.io" in readme
'@ | python -
```

- [ ] **Step 2: Run check and verify it fails**

Run:

```powershell
@'
from pathlib import Path
config = Path("_config.yml").read_text(encoding="utf-8")
assert "url: https://light8lee.github.io" in config
assert 'baseurl: ""' in config
assert "plugins:" in config
assert "gems:" not in config
assert not Path("CNAME").exists()
readme = Path("README.md").read_text(encoding="utf-8")
assert "light8lee.github.io" in readme
'@ | python -
```

Expected: FAIL because the old config contains `http://light8lee.pub`, `gems`, and `CNAME` still exists.

- [ ] **Step 3: Update config and README**

Edit `_config.yml` to contain the new site identity:

```yaml
title: 涛涛涛
description: Agent RL, technical writing, visual explainers, and engineering notes.
keywords: Agent RL, reinforcement learning, LLM agents, technical writing, visualization
url: https://light8lee.github.io
baseurl: ""
feed: /atom.xml
favicon: /images/shortcut.jpg

author:
  name: 涛涛涛
  email: light8lee@foxmail.com
  imageLink: /images/header.jpg
  simpleIntro: Technical notes on agents, RL, systems, and visual explanation.

nav:
  - text: Home
    url: /
  - text: Writing
    url: /archives.html
  - text: Projects
    url: /pages/projects.html
  - text: Notes
    url: /pages/notes.html
  - text: About
    url: /about.html

plugins:
  - jekyll-paginate
```

Keep existing Jekyll settings that are still needed, but remove old analytics/share/comment configuration and replace `gems` with `plugins`.

Delete `CNAME`.

Update `README.md` with:

```markdown
# light8lee.github.io

Personal homepage and technical blog for `https://light8lee.github.io/`.

This repository is prepared as a GitHub Pages user site. The remote repository should be named `light8lee.github.io` before publishing to the root GitHub Pages URL.

## Local Build

```powershell
bundle exec jekyll serve
```

## Content

- Markdown posts live in `_posts/`.
- Static assets live in `assets/`.
- Imported SCPO image-series assets live in `assets/posts/scpo/`.
```

- [ ] **Step 4: Run check and verify it passes**

Run the same Python assertion command from Step 1.

Expected: PASS with exit code 0.

- [ ] **Step 5: Commit**

```powershell
git add _config.yml README.md
git rm CNAME
git commit -m "Configure site for light8lee.github.io"
```

## Task 2: Layout and Includes

**Files:**
- Modify: `_layouts/default.html`
- Modify: `_layouts/post.html`
- Create: `_includes/site-header.html`
- Create: `_includes/site-footer.html`
- Create: `_includes/post-card.html`

- [ ] **Step 1: Write failing layout checks**

Run:

```powershell
@'
from pathlib import Path
default = Path("_layouts/default.html").read_text(encoding="utf-8")
post = Path("_layouts/post.html").read_text(encoding="utf-8")
assert "{% include site-header.html %}" in default
assert "{% include site-footer.html %}" in default
assert "cdn.bootcss.com" not in default
assert "duoshuo" not in default.lower()
assert "bd_share" not in default.lower()
assert "site.url }}/css/main.css" not in default
assert "{{ '/css/main.css' | relative_url }}" in default
assert "post-hero" in post
assert "page.tags" in post
for include in ["site-header.html", "site-footer.html", "post-card.html"]:
    assert Path("_includes", include).exists()
'@ | python -
```

Expected: FAIL because the includes do not exist and the layout still uses old external scripts.

- [ ] **Step 2: Replace default layout**

Write `_layouts/default.html` as a compact shell:

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{% if page.title %}{{ page.title }} - {{ site.title }}{% else %}{{ site.title }}{% endif %}</title>
    <meta name="description" content="{% if page.description %}{{ page.description }}{% else %}{{ site.description }}{% endif %}">
    <link rel="alternate" type="application/atom+xml" title="Recent Entries" href="{{ site.feed | relative_url }}">
    <link rel="shortcut icon" href="{{ site.favicon | relative_url }}" type="image/x-icon">
    <link rel="stylesheet" href="{{ '/css/syntax.css' | relative_url }}">
    <link rel="stylesheet" href="{{ '/css/main.css' | relative_url }}">
  </head>
  <body class="page-shell {% if page.body_class %}{{ page.body_class }}{% endif %}">
    {% include site-header.html %}
    <main class="site-main">
      {{ content }}
    </main>
    {% include site-footer.html %}
    {% if page.animation == 'home-constellation' %}
    <script src="{{ '/assets/js/animations/home-constellation.js' | relative_url }}" defer></script>
    {% endif %}
  </body>
</html>
```

- [ ] **Step 3: Create includes**

Create `_includes/site-header.html`:

```html
<header class="site-header">
  <a class="brand" href="{{ '/' | relative_url }}" aria-label="{{ site.title }} home">
    <span class="brand-mark">涛</span>
    <span class="brand-text">{{ site.title }}</span>
  </a>
  <nav class="site-nav" aria-label="Primary navigation">
    {% for link in site.nav %}
    <a href="{{ link.url | relative_url }}" {% if page.url == link.url %}aria-current="page"{% endif %}>{{ link.text }}</a>
    {% endfor %}
  </nav>
</header>
```

Create `_includes/site-footer.html`:

```html
<footer class="site-footer">
  <p>Writing, experiments, and visual notes by {{ site.author.name }}.</p>
  <p><a href="https://github.com/light8lee">GitHub</a> · <a href="{{ '/atom.xml' | relative_url }}">RSS</a></p>
</footer>
```

Create `_includes/post-card.html`:

```html
<article class="post-card">
  <a class="post-card-link" href="{{ include.post.url | relative_url }}">
    {% if include.post.cover %}
    <img src="{{ include.post.cover | relative_url }}" alt="" loading="lazy">
    {% endif %}
    <span class="post-card-date">{{ include.post.date | date: "%Y-%m-%d" }}</span>
    <h3>{{ include.post.title }}</h3>
    {% if include.post.summary %}
    <p>{{ include.post.summary }}</p>
    {% else %}
    <p>{{ include.post.excerpt | strip_html | truncate: 120 }}</p>
    {% endif %}
  </a>
</article>
```

- [ ] **Step 4: Replace post layout**

Write `_layouts/post.html`:

```html
---
layout: default
---
<article class="post">
  <header class="post-hero">
    <p class="post-date">{{ page.date | date: "%Y-%m-%d" }}</p>
    <h1>{{ page.title }}</h1>
    {% if page.summary %}
    <p class="post-summary">{{ page.summary }}</p>
    {% endif %}
    {% if page.tags %}
    <div class="tag-list">
      {% for tag in page.tags %}
      <span>{{ tag }}</span>
      {% endfor %}
    </div>
    {% endif %}
  </header>
  <div class="post-content">
    {{ content }}
  </div>
</article>
```

- [ ] **Step 5: Run layout checks**

Run the Python assertion command from Step 1.

Expected: PASS with exit code 0.

- [ ] **Step 6: Commit**

```powershell
git add _layouts/default.html _layouts/post.html _includes/site-header.html _includes/site-footer.html _includes/post-card.html
git commit -m "Modernize Jekyll layouts"
```

## Task 3: Homepage, Pages, and CSS

**Files:**
- Modify: `index.html`
- Modify: `about.html`
- Modify: `archives.html`
- Modify: `categories.html`
- Modify: `links.html`
- Create: `pages/projects.html`
- Create: `pages/notes.html`
- Modify: `css/main.css`

- [ ] **Step 1: Write failing page checks**

Run:

```powershell
@'
from pathlib import Path
index = Path("index.html").read_text(encoding="utf-8")
css = Path("css/main.css").read_text(encoding="utf-8")
assert "home-constellation" in index
assert "canvas" in index
assert "Latest Writing" in index
assert "Selected Projects" in index
assert ".site-header" in css
assert ".home-hero" in css
assert ".image-sequence" in css
assert Path("pages/projects.html").exists()
assert Path("pages/notes.html").exists()
for page in ["about.html", "archives.html", "categories.html", "links.html"]:
    text = Path(page).read_text(encoding="utf-8")
    assert "layout: default" in text
    assert "site.url" not in text
'@ | python -
```

Expected: FAIL because the new homepage, pages, and CSS do not exist yet.

- [ ] **Step 2: Replace homepage**

Write `index.html` with:

```html
---
layout: default
title: Home
body_class: home
animation: home-constellation
---
<section class="home-hero">
  <canvas id="home-constellation" aria-hidden="true"></canvas>
  <div class="home-hero-copy">
    <p class="home-kicker">Agent RL · Engineering Notes · Visual Explainers</p>
    <h1>涛涛涛</h1>
    <p>Writing about agents, reinforcement learning, systems, and the craft of making technical ideas easier to see.</p>
  </div>
</section>

<section class="content-section">
  <div class="section-heading">
    <h2>Latest Writing</h2>
    <a href="{{ '/archives.html' | relative_url }}">Archive</a>
  </div>
  <div class="post-grid">
    {% for post in site.posts limit:6 %}
      {% include post-card.html post=post %}
    {% endfor %}
  </div>
</section>

<section class="content-section split-section">
  <div>
    <h2>Selected Projects</h2>
    <p>Research notes, image-series explainers, and small static demos collected as durable web pages.</p>
  </div>
  <a class="button-link" href="{{ '/pages/projects.html' | relative_url }}">View Projects</a>
</section>
```

- [ ] **Step 3: Create pages**

Create `pages/projects.html`:

```html
---
layout: default
title: Projects
---
<section class="page-heading">
  <h1>Projects</h1>
  <p>Visual essays, research explainers, and small static experiments.</p>
</section>
<section class="post-list">
  {% for post in site.posts %}
    {% if post.tags contains "visual-essay" or post.tags contains "project" %}
      {% include post-card.html post=post %}
    {% endif %}
  {% endfor %}
</section>
```

Create `pages/notes.html`:

```html
---
layout: default
title: Notes
---
<section class="page-heading">
  <h1>Notes</h1>
  <p>Shorter technical notes and references.</p>
</section>
<section class="post-list">
  {% for post in site.posts %}
    {% include post-card.html post=post %}
  {% endfor %}
</section>
```

- [ ] **Step 4: Simplify legacy pages**

Rewrite the four legacy pages so they use `layout: default`, avoid `site.url`, and keep their original purpose:

`about.html` should introduce 涛涛涛 and link to GitHub.

`archives.html` should list all posts grouped by date.

`categories.html` should list categories and matching posts.

`links.html` should provide GitHub, arXiv source links for SCPO, and selected references.

- [ ] **Step 5: Replace CSS**

Write `css/main.css` with responsive rules for:

```css
:root {
  --bg: #f7f3ea;
  --surface: #ffffff;
  --text: #1d1d1f;
  --muted: #62605c;
  --line: #ded7ca;
  --accent: #2457a6;
  --accent-2: #b84a3a;
  --max: 1120px;
}
```

Include selectors for `.site-header`, `.brand`, `.site-nav`, `.site-main`, `.home-hero`, `#home-constellation`, `.home-hero-copy`, `.content-section`, `.post-grid`, `.post-card`, `.post`, `.post-hero`, `.post-content`, `.image-sequence`, `.source-list`, `.page-heading`, `.site-footer`, and mobile media queries at `720px`.

- [ ] **Step 6: Run page checks**

Run the Python assertion command from Step 1.

Expected: PASS with exit code 0.

- [ ] **Step 7: Commit**

```powershell
git add index.html about.html archives.html categories.html links.html pages/projects.html pages/notes.html css/main.css
git commit -m "Build modern homepage and pages"
```

## Task 4: SCPO Content Import

**Files:**
- Create: `assets/posts/scpo/final/p1.png` through `assets/posts/scpo/final/p13.png`
- Create: `assets/posts/scpo/notes/script.md`
- Create: `assets/posts/scpo/notes/revision-notes.md`
- Create: `assets/posts/scpo/notes/revision-v3-pages.md`
- Create: `assets/posts/scpo/notes/revision-v4-as-ae-final.md`
- Create: `assets/posts/scpo/notes/revision-v5-rollout-as-ae.md`
- Create: `assets/posts/scpo/notes/revision-v6-eval-analysis-pages.md`
- Create: `_posts/2026-07-04-scpo-semantic-consistency-policy-optimization.md`

- [ ] **Step 1: Write failing import checks**

Run:

```powershell
@'
from pathlib import Path
for i in range(1, 14):
    assert Path(f"assets/posts/scpo/final/p{i}.png").exists()
for name in ["script.md", "revision-notes.md", "revision-v3-pages.md", "revision-v4-as-ae-final.md", "revision-v5-rollout-as-ae.md", "revision-v6-eval-analysis-pages.md"]:
    assert Path("assets/posts/scpo/notes", name).exists()
post = Path("_posts/2026-07-04-scpo-semantic-consistency-policy-optimization.md")
assert post.exists()
text = post.read_text(encoding="utf-8")
assert "2606.25852" in text
assert "image-sequence" in text
assert text.count("<img src=") == 13
'@ | python -
```

Expected: FAIL because the imported assets and post do not exist.

- [ ] **Step 2: Copy SCPO assets**

Use PowerShell copy commands:

```powershell
New-Item -ItemType Directory -Force assets/posts/scpo/final
New-Item -ItemType Directory -Force assets/posts/scpo/notes
Copy-Item 'D:\Codex\Video\run-2026-07-03-scpo-xhs\final\*.png' assets/posts/scpo/final/
Copy-Item 'D:\Codex\Video\run-2026-07-03-scpo-xhs\*.md' assets/posts/scpo/notes/
```

- [ ] **Step 3: Create SCPO post**

Create `_posts/2026-07-04-scpo-semantic-consistency-policy-optimization.md` with front matter:

```yaml
---
layout: post
title: "SCPO: 从失败轨迹里找回正确步骤"
date: 2026-07-04
summary: "一组关于 Semantic Consistency Policy Optimization 的图文笔记：Agent RL 失败轨迹里，也可能藏着正确步骤。"
tags: [Agent RL, SCPO, visual-essay, paper-notes]
category: Agent RL
cover: /assets/posts/scpo/final/p1.png
---
```

Then add:

```markdown
Semantic Consistency Policy Optimization (SCPO) 关注 Agent RL 中一个很真实的问题：失败轨迹不代表每一步都错。长链路任务里，最后一步翻车经常会连带惩罚前面已经做对的搜索、筛选、导航和工具调用。

这组图文把论文的核心思路整理成 13 张卡片：用成功 sibling 作为参考，用冻结的 cross-encoder 做语义匹配，再通过单调信用和重排序把失败轨迹里的有效进展找回来。

<div class="source-list">
  <a href="https://arxiv.org/abs/2606.25852">arXiv</a>
  <a href="https://arxiv.org/html/2606.25852v1">HTML</a>
  <a href="{{ '/assets/posts/scpo/notes/script.md' | relative_url }}">script.md</a>
  <a href="{{ '/assets/posts/scpo/notes/revision-v6-eval-analysis-pages.md' | relative_url }}">revision notes</a>
</div>

<div class="image-sequence">
  <img src="{{ '/assets/posts/scpo/final/p1.png' | relative_url }}" alt="SCPO image card 1" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p2.png' | relative_url }}" alt="SCPO image card 2" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p3.png' | relative_url }}" alt="SCPO image card 3" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p4.png' | relative_url }}" alt="SCPO image card 4" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p5.png' | relative_url }}" alt="SCPO image card 5" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p6.png' | relative_url }}" alt="SCPO image card 6" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p7.png' | relative_url }}" alt="SCPO image card 7" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p8.png' | relative_url }}" alt="SCPO image card 8" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p9.png' | relative_url }}" alt="SCPO image card 9" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p10.png' | relative_url }}" alt="SCPO image card 10" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p11.png' | relative_url }}" alt="SCPO image card 11" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p12.png' | relative_url }}" alt="SCPO image card 12" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p13.png' | relative_url }}" alt="SCPO image card 13" loading="lazy">
</div>
```

- [ ] **Step 4: Run import checks**

Run the Python assertion command from Step 1.

Expected: PASS with exit code 0.

- [ ] **Step 5: Commit**

```powershell
git add assets/posts/scpo _posts/2026-07-04-scpo-semantic-consistency-policy-optimization.md
git commit -m "Import SCPO visual essay"
```

## Task 5: Animation Module

**Files:**
- Create: `assets/js/animations/home-constellation.js`

- [ ] **Step 1: Write failing animation check**

Run:

```powershell
@'
from pathlib import Path
path = Path("assets/js/animations/home-constellation.js")
assert path.exists()
text = path.read_text(encoding="utf-8")
assert "requestAnimationFrame" in text
assert "prefers-reduced-motion" in text
assert "home-constellation" in text
'@ | python -
```

Expected: FAIL because the module does not exist.

- [ ] **Step 2: Create animation module**

Create a small canvas script that:

- Finds `#home-constellation`.
- Skips animation if `prefers-reduced-motion: reduce`.
- Draws slow-moving points and connecting lines.
- Resizes to the canvas parent.
- Uses `requestAnimationFrame`.

- [ ] **Step 3: Run animation check**

Run the Python assertion command from Step 1.

Expected: PASS with exit code 0.

- [ ] **Step 4: Commit**

```powershell
git add assets/js/animations/home-constellation.js
git commit -m "Add homepage canvas animation"
```

## Task 6: Build and Link Verification

**Files:**
- Generated: `_site/`
- Possible verification fixes: any source file named in Tasks 1 through 5, only when a build or link check identifies a concrete failure.

- [ ] **Step 1: Detect available Jekyll command**

Run:

```powershell
if (Get-Command bundle -ErrorAction SilentlyContinue) { bundle exec jekyll --version } elseif (Get-Command jekyll -ErrorAction SilentlyContinue) { jekyll --version } else { Write-Output 'NO_JEKYLL' }
```

Expected: prints a Jekyll version or `NO_JEKYLL`.

- [ ] **Step 2: Build site if Jekyll is available**

If Bundler is available, run:

```powershell
bundle exec jekyll build
```

If only Jekyll is available, run:

```powershell
jekyll build
```

Expected: exit code 0 and generated `_site/`.

- [ ] **Step 3: Verify generated links**

If `_site/` exists, run:

```powershell
@'
from pathlib import Path
html = "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in Path("_site").rglob("*.html"))
assert "light8lee.pub" not in html
assert "cdn.bootcss.com" not in html
assert "duoshuo" not in html.lower()
assert "/assets/posts/scpo/final/p1.png" in html
assert "SCPO" in html
'@ | python -
```

Expected: PASS with exit code 0.

- [ ] **Step 4: Start local server**

Run:

```powershell
bundle exec jekyll serve --host 127.0.0.1 --port 4000
```

If port 4000 is busy, use:

```powershell
bundle exec jekyll serve --host 127.0.0.1 --port 4001
```

Expected: local site available at `http://127.0.0.1:4000/` or `http://127.0.0.1:4001/`.

- [ ] **Step 5: Manual browser verification**

Check:

- Homepage loads.
- Header navigation works.
- Archive opens.
- About opens.
- SCPO post opens.
- 13 SCPO images render.
- The canvas animation appears on the homepage, or is intentionally static when reduced motion is enabled.
- Mobile width does not overflow.

- [ ] **Step 6: Final commit if verification required fixes**

If fixes were made:

```powershell
git add _config.yml README.md index.html about.html archives.html categories.html links.html css/main.css _layouts/default.html _layouts/post.html _includes/site-header.html _includes/site-footer.html _includes/post-card.html pages/projects.html pages/notes.html assets/js/animations/home-constellation.js _posts/2026-07-04-scpo-semantic-consistency-policy-optimization.md
git commit -m "Fix site verification issues"
```

If no fixes were made, do not create an empty commit.

## Self-Review

- Spec coverage: The plan covers user-site deployment, old-domain removal, Jekyll architecture, Markdown content, SCPO import, static animation support, and verification.
- Placeholder scan: The plan contains no unresolved placeholder markers, ellipsis placeholders, or angle-bracket file placeholders.
- Type consistency: Paths and names are consistent across tasks: `home-constellation`, `assets/posts/scpo/final`, `pages/projects.html`, and `_posts/2026-07-04-scpo-semantic-consistency-policy-optimization.md`.
