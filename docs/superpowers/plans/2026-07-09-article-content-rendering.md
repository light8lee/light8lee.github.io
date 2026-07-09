# Article Content Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every article page provide a responsive heading directory, independently scrollable code blocks, and correctly rendered mathematics outside code nodes.

**Architecture:** Keep Markdown and Jekyll as the source and build layer. Add one focused client script that enhances article headings and directory navigation, add shared layout/CSS hooks for responsive presentation, and enforce content constraints with PowerShell regression checks. Formula-bearing pseudocode is rewritten into prose/algorithm steps because MathJax intentionally skips `pre` and `code`.

**Tech Stack:** Jekyll, Kramdown, vanilla JavaScript, CSS, MathJax 3, PowerShell regression scripts.

---

### Task 1: Add failing article-rendering regression checks

**Files:**
- Create: `scripts/check_article_rendering.ps1`
- Modify: `scripts/check_markdown_code.ps1`

- [ ] **Step 1: Create the rendered-page check**

Create `scripts/check_article_rendering.ps1` to iterate over `_site/**/*.html`, select pages containing `<article class="post">`, and fail unless each page contains:

```powershell
$requiredPatterns = @(
    'class="post-layout"',
    'class="post-toc"',
    'class="post-toc-toggle"',
    'data-post-content'
)
```

For every rendered article, also extract all heading `id` values under `data-post-content` and fail when any non-empty ID occurs more than once.

- [ ] **Step 2: Extend the Markdown code check**

In `scripts/check_markdown_code.ps1`, inspect every non-Mermaid fenced block and append a failure when a line contains a MathJax delimiter:

```powershell
if ($inFence -and $fenceLanguage -ne "mermaid" -and
    $lines[$index] -match '(\$\$|\$[^$\r\n]+\$|\\\(|\\\[)') {
    $failures += "$($post.Name):$($index + 1): math delimiter inside code fence"
}
```

Track `$fenceLanguage` from the opening fence and clear it at the closing fence.

- [ ] **Step 3: Build the current site**

Run:

```powershell
bundle exec jekyll build
```

Expected: exit code 0.

- [ ] **Step 4: Verify the new checks fail**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_article_rendering.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_code.ps1
```

Expected: the rendering check reports missing directory hooks; the code check reports any formula-bearing non-Mermaid fences that still exist.

- [ ] **Step 5: Commit the failing checks**

```powershell
git add scripts/check_article_rendering.ps1 scripts/check_markdown_code.ps1
git commit -m "test: cover article navigation and fenced math"
```

### Task 2: Add the semantic article layout

**Files:**
- Modify: `_layouts/post.html`
- Test: `scripts/check_article_rendering.ps1`

- [ ] **Step 1: Add the shared directory and content hooks**

Replace the single article wrapper with:

```html
<div class="post-layout" data-post-layout>
  <aside class="post-toc" data-post-toc hidden>
    <button class="post-toc-toggle"
            type="button"
            aria-expanded="false"
            aria-controls="post-toc-list"
            data-post-toc-toggle>
      本文目录
      <span aria-hidden="true">⌄</span>
    </button>
    <nav id="post-toc-list" class="post-toc-list" aria-label="本文目录" data-post-toc-list></nav>
  </aside>
  <article class="post">
    <!-- preserve the existing post hero exactly -->
    <div class="post-content" data-post-content>
      {{ content }}
    </div>
  </article>
</div>
```

- [ ] **Step 2: Rebuild and verify structural checks**

Run:

```powershell
bundle exec jekyll build
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_article_rendering.ps1
```

Expected: all rendered article pages contain the required hooks and duplicate heading IDs are not introduced.

- [ ] **Step 3: Commit the layout**

```powershell
git add _layouts/post.html
git commit -m "feat: add article directory layout"
```

### Task 3: Generate and operate the article directory

**Files:**
- Create: `assets/js/post-navigation.js`
- Modify: `_layouts/default.html`
- Test: `scripts/check_article_rendering.ps1`

- [ ] **Step 1: Add a script-presence assertion**

Extend `scripts/check_article_rendering.ps1` so every rendered post page must contain:

```powershell
if ($html -notmatch '/assets/js/post-navigation\.js') {
    $failures += "$($file.FullName): post navigation script is missing"
}
```

- [ ] **Step 2: Verify the assertion fails**

Run:

```powershell
bundle exec jekyll build
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_article_rendering.ps1
```

Expected: failure stating that the post navigation script is missing.

- [ ] **Step 3: Implement focused directory enhancement**

Create `assets/js/post-navigation.js` with:

```javascript
(function () {
  function slugify(text, index) {
    var slug = text.trim().toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\p{Letter}\p{Number}\-_]+/gu, "");
    return slug || "section-" + (index + 1);
  }

  function initPostNavigation() {
    var layout = document.querySelector("[data-post-layout]");
    if (!layout) return;

    var content = layout.querySelector("[data-post-content]");
    var toc = layout.querySelector("[data-post-toc]");
    var list = layout.querySelector("[data-post-toc-list]");
    var toggle = layout.querySelector("[data-post-toc-toggle]");
    var headings = Array.prototype.slice.call(content.querySelectorAll("h1, h2, h3"));
    if (!headings.length) return;

    var used = Object.create(null);
    headings.forEach(function (heading, index) {
      var base = heading.id || slugify(heading.textContent, index);
      var id = base;
      var suffix = 2;
      while (used[id]) id = base + "-" + suffix++;
      used[id] = true;
      heading.id = id;

      var link = document.createElement("a");
      link.href = "#" + encodeURIComponent(id);
      link.className = "post-toc-link post-toc-level-" + heading.tagName.slice(1);
      link.textContent = heading.textContent.trim();
      link.dataset.tocTarget = id;
      list.appendChild(link);
    });

    toc.hidden = false;
    toggle.addEventListener("click", function () {
      var open = toc.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    list.addEventListener("click", function () {
      toc.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });

    if ("IntersectionObserver" in window) {
      var links = Array.prototype.slice.call(list.querySelectorAll("a"));
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (link) {
            link.classList.toggle("is-active", link.dataset.tocTarget === entry.target.id);
          });
        });
      }, { rootMargin: "-15% 0px -70% 0px" });
      headings.forEach(function (heading) { observer.observe(heading); });
    }
  }

  document.addEventListener("DOMContentLoaded", initPostNavigation);
}());
```

- [ ] **Step 4: Load the script only on post layouts**

Before `</body>` in `_layouts/default.html`, add:

```liquid
{% if page.layout == 'post' %}
<script src="{{ '/assets/js/post-navigation.js' | relative_url }}" defer></script>
{% endif %}
```

- [ ] **Step 5: Rebuild and verify**

Run:

```powershell
bundle exec jekyll build
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_article_rendering.ps1
```

Expected: exit code 0 and `All article rendering checks passed.`

- [ ] **Step 6: Commit directory behavior**

```powershell
git add assets/js/post-navigation.js _layouts/default.html scripts/check_article_rendering.ps1
git commit -m "feat: generate article heading navigation"
```

### Task 4: Style the desktop directory, mobile disclosure, and code cards

**Files:**
- Modify: `css/main.css`
- Test: `scripts/check_article_rendering.ps1`

- [ ] **Step 1: Add CSS-marker checks**

Have `scripts/check_article_rendering.ps1` read `css/main.css` and fail unless it contains `.post-layout`, `.post-toc`, `.post-toc-link.is-active`, `.post-toc-toggle`, and `.post-content pre`.

- [ ] **Step 2: Verify the marker check fails**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_article_rendering.ps1
```

Expected: failure listing missing CSS markers.

- [ ] **Step 3: Add desktop and code-card styles**

Add focused rules:

```css
.post-layout {
  display: grid;
  gap: 32px;
  grid-template-columns: minmax(180px, 220px) minmax(0, 880px);
  margin: 0 auto;
  max-width: 1132px;
}
.post-layout .post { min-width: 0; width: 100%; }
.post-toc { align-self: start; padding-top: 56px; }
.post-toc-list {
  display: grid;
  gap: 4px;
  max-height: calc(100vh - 96px);
  overflow-y: auto;
  position: sticky;
  top: 24px;
}
.post-toc-link {
  border-left: 2px solid transparent;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.4;
  padding: 5px 8px;
  text-decoration: none;
}
.post-toc-level-2 { padding-left: 18px; }
.post-toc-level-3 { padding-left: 30px; }
.post-toc-link.is-active {
  border-left-color: var(--accent);
  color: var(--accent);
  font-weight: 800;
}
.post-toc-toggle { display: none; }
.post-content pre {
  background: #111827;
  border: 1px solid #253047;
  border-radius: 8px;
  color: #e5edf8;
  max-width: 100%;
  overflow-x: auto;
  padding: 18px;
}
.post-content pre code {
  background: transparent;
  color: inherit;
  padding: 0;
  white-space: pre;
}
```

- [ ] **Step 4: Add mobile disclosure styles**

Inside the existing `@media (max-width: 720px)` block, add:

```css
.post-layout { display: block; }
.post-toc { padding-top: 24px; }
.post-toc-toggle {
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  display: flex;
  font: inherit;
  font-weight: 800;
  justify-content: space-between;
  padding: 10px 12px;
  width: 100%;
}
.post-toc-list {
  display: none;
  max-height: 50vh;
  padding: 8px 0;
  position: static;
}
.post-toc.is-open .post-toc-list { display: grid; }
```

- [ ] **Step 5: Rebuild and verify checks**

Run:

```powershell
bundle exec jekyll build
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_article_rendering.ps1
```

Expected: exit code 0.

- [ ] **Step 6: Commit styles**

```powershell
git add css/main.css scripts/check_article_rendering.ps1
git commit -m "style: add responsive article navigation and code cards"
```

### Task 5: Rewrite formula-bearing pseudocode

**Files:**
- Modify: `_posts/2026-05-18-opd.md`
- Modify: `_posts/2026-06-14-ppo-dpo-grpo.md`
- Modify: `scripts/publish_llm_source_notes.py` only when a rewritten block is generated by that publisher
- Test: `scripts/check_markdown_code.ps1`
- Test: `scripts/check_markdown_math.ps1`

- [ ] **Step 1: Run the fenced-math check and capture the exact files**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_code.ps1
```

Expected: failures identify every non-Mermaid code fence containing MathJax delimiters.

- [ ] **Step 2: Rewrite each reported pseudocode block**

For descriptive algorithm blocks, replace fenced text such as:

````markdown
```text
状态 $s_t = (x, y_{<t})$
动作 $a_t = y_t$
```
````

with Markdown that keeps math outside code:

```markdown
<div class="algorithm-steps" markdown="1">

1. 状态：$s_t = (x, y_{<t})$
2. 动作：$a_t = y_t$

</div>
```

Keep executable Python fenced as `python`; do not rewrite Mermaid fences.

- [ ] **Step 3: Preserve generated content**

When `scripts/publish_llm_source_notes.py` emits any changed block, update its template/replacement so regeneration produces the same `algorithm-steps` markup.

- [ ] **Step 4: Style algorithm steps**

Add to `css/main.css`:

```css
.algorithm-steps {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--text);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  margin: 22px 0;
  overflow-x: auto;
  padding: 16px 18px;
}
.algorithm-steps > :first-child { margin-top: 0; }
.algorithm-steps > :last-child { margin-bottom: 0; }
```

- [ ] **Step 5: Run content regressions**

Run:

```powershell
python -m py_compile scripts\publish_llm_source_notes.py
bundle exec jekyll build
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_code.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_math.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_tables.ps1
```

Expected: every command exits 0.

- [ ] **Step 6: Commit content fixes**

```powershell
git add _posts css/main.css scripts/publish_llm_source_notes.py
git commit -m "fix: render formulas outside pseudocode fences"
```

### Task 6: Browser verification and final regression

**Files:**
- Verify: `_site/**/*.html`
- Verify: representative posts containing long code, MathJax, and Mermaid

- [ ] **Step 1: Start the local site**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\serve.ps1
```

Expected: Jekyll serves the site at its configured local URL.

- [ ] **Step 2: Verify desktop behavior**

Open a representative long article at 1440 px width and confirm:

- the left directory remains sticky;
- clicking each level jumps to the matching heading;
- the active entry changes while scrolling;
- long code scrolls inside its own card;
- the document body has no horizontal overflow;
- MathJax and Mermaid both render.

- [ ] **Step 3: Verify mobile behavior**

At 390 px width, confirm:

- “本文目录” is collapsed initially;
- the button toggles `aria-expanded`;
- selecting an entry closes the directory;
- code and formulas remain readable without widening the page.

- [ ] **Step 4: Run the complete regression suite**

Run:

```powershell
bundle exec jekyll build
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_article_rendering.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_code.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_math.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_tables.ps1
git diff --check
```

Expected: all checks pass and `git diff --check` produces no errors.

- [ ] **Step 5: Commit any verification-only corrections**

If browser verification required corrections:

```powershell
git add _layouts _posts assets/js css scripts
git commit -m "fix: polish article reading behavior"
```

If no corrections were required, do not create an empty commit.
