# LaTeX Formula Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert mathematical notation in the eight "大模型基础知识" posts into readable MathJax-rendered LaTeX while preserving the original meaning.

**Architecture:** Treat Markdown as the source of truth and keep the existing MathJax 3 runtime. Replace formula-only images with display math, supplement explanatory screenshots with equivalent LaTeX, normalize inline Unicode notation, and extend the publishing script so regeneration preserves the fixes. Add a static regression checker, then validate generated HTML and rendered pages.

**Tech Stack:** Jekyll, Kramdown, MathJax 3, PowerShell regression scripts, Python publishing script.

---

### Task 1: Add Formula Regression Coverage

**Files:**
- Create: `scripts/check_markdown_math.ps1`

- [ ] **Step 1: Write the failing check**

Scan collection posts outside fenced code for formula-only image references, known duplicated formula tokens such as `RtotalRtotal`, and bare mathematical Unicode identifiers that should be LaTeX.

- [ ] **Step 2: Verify the check fails**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_math.ps1
```

Expected: failures identifying current formula images and malformed formula text.

### Task 2: Convert Formula Images

**Files:**
- Modify: `_posts/2026-05-05-rope.md`
- Modify: `_posts/2026-05-06-sampling.md`
- Modify: `_posts/2026-06-14-ppo-dpo-grpo.md`
- Modify: `_posts/2026-05-18-opd.md`

- [ ] **Step 1: Replace formula-only images**

Use `$$...$$` for standalone equations and `$...$` for short inline notation. Preserve definitions, cases, normalization constants, and distribution direction.

- [ ] **Step 2: Supplement explanatory screenshots**

Keep a screenshot only when it contains useful prose or comparison context; place equivalent LaTeX equations in the surrounding Markdown so formulas are selectable and accessible.

### Task 3: Normalize Inline Mathematics

**Files:**
- Modify: `_posts/2026-05-05-transformer.md`
- Modify: `_posts/2026-05-05-rope.md`
- Modify: `_posts/2026-05-06-sampling.md`
- Modify: `_posts/2026-05-05-lora.md`
- Modify: `_posts/2026-06-14-ppo-dpo-grpo.md`
- Modify: `_posts/2026-06-15-grpo-pytorch.md`
- Modify: `_posts/2026-05-18-opd.md`

- [ ] **Step 1: Convert mathematical identifiers**

Normalize subscripts, superscripts, Greek letters, matrix dimensions, probability notation, and loss names into LaTeX without changing code blocks or Mermaid source.

- [ ] **Step 2: Repair duplicated OCR notation**

Replace tokens such as `RtRt`, `AtAt`, `RtotalRtotal`, and `πθold` with unambiguous LaTeX.

### Task 4: Preserve Regeneration Behavior

**Files:**
- Modify: `scripts/publish_llm_source_notes.py`

- [ ] **Step 1: Add deterministic formula normalization**

Apply narrowly scoped replacements for source-note formula images and known malformed notation during publication.

- [ ] **Step 2: Compile-check the publisher**

Run:

```powershell
python -m py_compile scripts\publish_llm_source_notes.py
```

Expected: exit code 0.

### Task 5: Verify Rendering

**Files:**
- Verify: `_site/大模型基础知识/**/*.html`

- [ ] **Step 1: Build and run regressions**

```powershell
bundle exec jekyll build
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_math.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_code.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check_markdown_tables.ps1
```

Expected: build and all checks pass.

- [ ] **Step 2: Browser-check representative pages**

Verify MathJax containers, absence of raw delimiters and parse errors, no page-level horizontal overflow, and readable display math at desktop and mobile widths.
