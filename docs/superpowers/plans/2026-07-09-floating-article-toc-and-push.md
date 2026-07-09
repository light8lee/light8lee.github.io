# Floating Article TOC and Push Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the desktop article directory visible while scrolling, preserve the mobile disclosure behavior, and push the verified `master` branch to GitHub.

**Architecture:** Move sticky positioning from the directory list to its grid-column container so the entire directory can stick within the article layout. Keep list scrolling independent, override positioning on mobile, and validate the behavior through CSS regression checks plus real browser scrolling. Use the existing HTTPS remote and Git Credential Manager because fetch and push dry-run already succeed.

**Tech Stack:** Jekyll, CSS, PowerShell regression scripts, in-app browser, Git.

---

### Task 1: Add a failing sticky-container regression

**Files:**
- Modify: `scripts/check_article_rendering.ps1`

- [ ] **Step 1: Add CSS positioning assertions**

After loading `css/main.css`, normalize whitespace and require:

```powershell
$normalizedCss = $css -replace '\s+', ' '

if ($normalizedCss -notmatch '\.post-toc\s*\{[^}]*position:\s*sticky;[^}]*top:\s*24px;') {
    $failures += "$($CssPath): .post-toc must be the sticky container"
}

if ($normalizedCss -match '\.post-toc-list\s*\{[^}]*position:\s*sticky;') {
    $failures += "$($CssPath): .post-toc-list must not own sticky positioning"
}

if ($normalizedCss -notmatch '@media\s*\(max-width:\s*720px\)[\s\S]*?\.post-toc\s*\{[^}]*position:\s*static;') {
    $failures += "$($CssPath): mobile .post-toc must return to static positioning"
}
```

- [ ] **Step 2: Run the check and verify RED**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_article_rendering.ps1
```

Expected: failure that `.post-toc` is not the sticky container and the list still owns sticky positioning.

### Task 2: Move sticky positioning to the directory container

**Files:**
- Modify: `css/main.css`
- Test: `scripts/check_article_rendering.ps1`

- [ ] **Step 1: Implement the desktop positioning**

Update the desktop rules to:

```css
.post-toc {
  align-self: start;
  max-height: calc(100vh - 48px);
  padding-top: 56px;
  position: sticky;
  top: 24px;
}

.post-toc-list {
  display: grid;
  gap: 4px;
  max-height: calc(100vh - 128px);
  overflow-y: auto;
}
```

- [ ] **Step 2: Preserve mobile flow**

Inside `@media (max-width: 720px)`, update `.post-toc`:

```css
.post-toc {
  max-height: none;
  padding-top: 24px;
  position: static;
}
```

- [ ] **Step 3: Verify GREEN**

Run:

```powershell
bundle exec jekyll build
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_article_rendering.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_code.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_math.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_tables.ps1
```

Expected: build and all checks pass.

- [ ] **Step 4: Commit**

```powershell
git add css/main.css scripts/check_article_rendering.ps1
git commit -m "fix: keep article directory visible while scrolling"
```

### Task 3: Verify rendered scrolling behavior

**Files:**
- Verify: a long generated article page

- [ ] **Step 1: Start Jekyll on an unused local port**

Run Jekyll from `D:\Codex\github.io` on port `4101`.

- [ ] **Step 2: Verify desktop behavior**

At 1440×900:

- record `.post-toc` top position before scrolling;
- scroll several viewports using the browser;
- confirm `.post-toc` remains approximately 24px from the viewport top;
- confirm the directory stays left of the article and page horizontal overflow is zero;
- confirm the directory list can scroll when its content exceeds its maximum height.

- [ ] **Step 3: Verify mobile behavior**

At 390×844:

- confirm `.post-toc` computed position is `static`;
- confirm the directory list is initially hidden;
- expand the “本文目录” button and confirm the list becomes visible;
- select an item and confirm the list closes.

### Task 4: Final verification and push

**Files:**
- Verify: repository state

- [ ] **Step 1: Run the complete local verification**

```powershell
python -m py_compile scripts\publish_llm_source_notes.py
node --check assets\js\post-navigation.js
bundle exec jekyll build
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_article_rendering.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_code.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_math.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_tables.ps1
git diff --check
git status --short
```

Expected: all commands pass and the working tree is clean.

- [ ] **Step 2: Recheck remote write path**

```powershell
git fetch origin
git push --dry-run origin master
```

Expected: both commands succeed.

- [ ] **Step 3: Push**

```powershell
git push origin master
```

Expected: `master` advances on GitHub to the local verified commit.

- [ ] **Step 4: Verify remote state**

```powershell
git rev-parse HEAD
git ls-remote origin refs/heads/master
```

Expected: both commit hashes are identical.
