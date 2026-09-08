# Related Reading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive, accessible “继续阅读” sidebar that ranks up to five related posts, bookshelf pages, and Daydreams by tag and title similarity.

**Architecture:** The post template emits a JSON candidate index from published `site.posts` and `site.pages`. A standalone vanilla-JavaScript module owns scoring and DOM rendering, exporting pure functions for Node tests. CSS extends the current reading grid to a three-column desktop layout and places the sidebar after the article on small screens.

**Tech Stack:** Jekyll/Liquid, vanilla JavaScript, Node built-in `node:test`, CSS Grid, Ruby/Jekyll.

---

## File structure

- Create: `assets/js/related-posts.js` — ranking functions and browser hydration.
- Create: `tests/related-posts.test.cjs` — Node unit tests.
- Modify: `_layouts/post.html` — related navigation and JSON payload.
- Modify: `_layouts/default.html` — script loading.
- Modify: `css/main.css` and `assets/css/thought-studio.css` — layout and visual rules.

### Task 1: Write and prove ranking behavior

**Files:**
- Create: `tests/related-posts.test.cjs`
- Create: `assets/js/related-posts.js`

- [ ] **Step 1: Write the failing test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { findRelatedPosts } = require('../assets/js/related-posts.js');

const current = { title: 'Agent evaluation workflow', url: '/current/', tags: ['Agent', '评估'] };
const candidates = [
  { title: 'Agent evaluation workflow guide', url: '/both/', tags: ['Agent', '评估'], date: '2026-09-03' },
  { title: 'Agent workflow patterns', url: '/title/', tags: [], date: '2026-09-05' },
  { title: 'Unrelated reading', url: '/none/', tags: ['视觉'], date: '2026-09-06' },
  { title: 'Current duplicate', url: '/current/', tags: ['Agent'], date: '2026-09-07' },
  { title: 'Hidden', url: '/hidden/', tags: ['Agent'], published: false, date: '2026-09-08' }
];

test('ranks tags before title-only matches and removes ineligible candidates', () => {
  assert.deepEqual(findRelatedPosts(current, candidates).map((item) => item.url), ['/both/', '/title/']);
});

test('keeps five newest results when scores tie', () => {
  const sameTag = Array.from({ length: 6 }, (_, index) => ({
    title: 'Note ' + index, url: '/note-' + index + '/', tags: ['Agent'], date: '2026-09-0' + (index + 1)
  }));
  assert.deepEqual(findRelatedPosts(current, sameTag).map((item) => item.url), ['/note-5/', '/note-4/', '/note-3/', '/note-2/', '/note-1/']);
});

test('returns an empty result when no topic overlaps', () => {
  assert.deepEqual(findRelatedPosts(current, [{ title: 'Database indexes', url: '/db/', tags: ['SQL'] }]), []);
});
```

- [ ] **Step 2: Verify red**

Run: `node --test tests/related-posts.test.cjs`

Expected: FAIL because `assets/js/related-posts.js` does not exist.

- [ ] **Step 3: Implement the smallest module that passes**

Create a UMD-style `assets/js/related-posts.js`: export `findRelatedPosts` through `module.exports` for Node and `window.RelatedPosts` for browser initialization.

```js
function normalized(value) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, ' ').trim();
}

function titleTokens(title) {
  var text = normalized(title);
  var tokens = new Set((text.match(/[a-z0-9][a-z0-9-]*/g) || []).filter(function (token) { return token.length > 1; }));
  var han = text.match(/[\u3400-\u9fff]/g) || [];
  for (var index = 0; index < han.length - 1; index += 1) tokens.add(han[index] + han[index + 1]);
  return tokens;
}

function findRelatedPosts(current, candidates, limit) {
  var currentTags = new Set((current.tags || []).map(normalized));
  var currentTokens = titleTokens(current.title);
  return candidates.filter(function (candidate) {
    return candidate && candidate.url && candidate.url !== current.url && candidate.published !== false;
  }).map(function (candidate) {
    var sharedTags = (candidate.tags || []).filter(function (tag) { return currentTags.has(normalized(tag)); });
    var titleScore = Array.from(titleTokens(candidate.title)).filter(function (token) { return currentTokens.has(token); }).slice(0, 4).length;
    return Object.assign({}, candidate, { sharedTags: sharedTags, score: sharedTags.length * 8 + titleScore });
  }).filter(function (candidate) { return candidate.score > 0; }).sort(function (left, right) {
    return right.score - left.score || String(right.date || '').localeCompare(String(left.date || '')) || left.title.localeCompare(right.title, 'zh-CN');
  }).slice(0, limit || 5);
}
```

The initializer parses `[data-related-posts-data]`, reads the current data attributes from `[data-related-posts]`, renders anchors into `[data-related-posts-list]`, and only removes `hidden` when results exist. Invalid JSON leaves the panel hidden.

- [ ] **Step 4: Verify green**

Run: `node --test tests/related-posts.test.cjs`

Expected: 3 passing tests and 0 failures.

- [ ] **Step 5: Commit**

```bash
git add assets/js/related-posts.js tests/related-posts.test.cjs
git commit -m "Add related post ranking"
```

### Task 2: Render data for posts, bookshelf pages, and Daydreams

**Files:**
- Modify: `_layouts/post.html`
- Modify: `_layouts/default.html`

- [ ] **Step 1: Verify the shell is absent before the change**

```powershell
C:\Ruby33-x64\bin\bundle.bat exec jekyll build
Select-String -Path '_site/pages/llm-skill-evaluation.html' -Pattern 'data-related-posts-data'
```

Expected: build succeeds and the string is absent.

- [ ] **Step 2: Add semantic navigation and payload**

After the existing post TOC in `_layouts/post.html`, add an initially hidden `<aside class="related-posts" data-related-posts>` with an `aria-labelledby` heading “继续阅读”, a concise description, and an empty `<div data-related-posts-list>`. Its current title, URL, and tags attributes use `jsonify`.

After `.post-layout`, use this Liquid payload:

```liquid
{% assign related_candidates = site.posts | concat: site.pages %}
<script type="application/json" data-related-posts-data>
[
{% assign first_related_candidate = true %}
{% for candidate in related_candidates %}
  {% if candidate.layout == 'post' and candidate.published != false and candidate.title and candidate.url and candidate.url != page.url %}
    {% unless first_related_candidate %},{% endunless %}
    {"title":{{ candidate.title | jsonify }},"url":{{ candidate.url | relative_url | jsonify }},"tags":{{ candidate.tags | default: empty | jsonify }},"date":{{ candidate.date | date_to_xmlschema | jsonify }}}
    {% assign first_related_candidate = false %}
  {% endif %}
{% endfor %}
]
</script>
```

In `_layouts/default.html`, load `/assets/js/related-posts.js` with `defer` in the existing `page.layout == 'post'` script block, before `post-navigation.js`.

- [ ] **Step 3: Verify rendered output**

Re-run Step 1. Expected: build exits 0 and the output includes exactly one candidate payload and related navigation shell.

- [ ] **Step 4: Commit**

```bash
git add _layouts/post.html _layouts/default.html
git commit -m "Render related reading candidates"
```

### Task 3: Style and verify the responsive right rail

**Files:**
- Modify: `css/main.css`
- Modify: `assets/css/thought-studio.css`

- [ ] **Step 1: Confirm no prior related-panel CSS exists**

Run: `rg -n '\.related-posts' css/main.css assets/css/thought-studio.css`

Expected: no output.

- [ ] **Step 2: Add base and theme styles**

In `css/main.css`, define a hidden `.related-posts` and show it through `.related-posts:not([hidden])`. Its desktop rules are `align-self: start`, `position: sticky`, `top: 24px`, and `max-height: calc(100vh - 48px)`. Define readable heading, description, link, shared-tag, hover, and `:focus-visible` rules.

At the existing mobile breakpoint that makes `.post-layout` block-level, set `.related-posts { position: static; max-height: none; margin-top: 32px; }`. The template’s DOM order makes it follow the article on mobile.

In `assets/css/thought-studio.css`, add the paper/ink palette and a `var(--axis-shu)` top border. At `min-width: 901px`, change only the existing site post grid to:

```css
grid-template-columns: minmax(165px, 205px) minmax(0, 1fr) minmax(220px, 270px);
```

Do not increase the existing `.post` maximum width.

- [ ] **Step 3: Verify desktop and mobile**

Open `/pages/llm-skill-evaluation.html`. At 1440×960, confirm a visible three-column grid and a sticky related rail. At 390×844, confirm the panel follows the article and `document.documentElement.scrollWidth === document.documentElement.clientWidth`.

- [ ] **Step 4: Commit**

```bash
git add css/main.css assets/css/thought-studio.css
git commit -m "Style related reading sidebar"
```

### Task 4: Run end-to-end verification

**Files:**
- Verify: `tests/related-posts.test.cjs`
- Verify: `_site/pages/llm-skill-evaluation.html`
- Verify: `_site/pages/ai-engineering-loop.html`
- Verify: `_site/daydreams/semantic-harness/index.html`

- [ ] **Step 1: Run unit tests**

Run: `node --test tests/related-posts.test.cjs`

Expected: 3 passing tests and 0 failures.

- [ ] **Step 2: Build and check formatting**

```powershell
C:\Ruby33-x64\bin\bundle.bat exec jekyll build
git diff --check
```

Expected: build exits 0 and the diff check is empty.

- [ ] **Step 3: Check candidate-family coverage**

Parse the candidate payload on the three generated pages. Each must be valid JSON and collectively contain `/pages/`, `/daydreams/`, and a dated post route.

- [ ] **Step 4: Visual acceptance**

At 1440px and 390px, verify every displayed link resolves locally, each panel has 1–5 links, desktop sticky behavior works, mobile has no overflow, and current article never appears in its own list.

- [ ] **Step 5: Inspect scope before handoff**

```bash
git status --short
git diff --stat
```

Expected: task files are limited to the module, tests, templates, and styles; pre-existing `_config.yml` and `index.html` edits are preserved.
