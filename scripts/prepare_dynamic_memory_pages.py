"""Adapt exported standalone reports to the shared Jekyll workshop layout.

Run after importing fresh HTML from the experiment project. Content, controls,
local CSS and script ordering are retained; the shared layout owns navigation,
fonts, site styles and the single MathJax installation.
"""
from __future__ import annotations

from html.parser import HTMLParser
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / 'projects/dynamic-weight-qwen'
PAGES = {
    'index.html': '只观察用户信息的跨会话记忆实验：真实对话、十种方法与逐条结果。',
    'diagnosis.html': '通过前缀、门控、单概念对照与强制读出，定位动态记忆失败的原因。',
    'teacher-qa.html': '历史教师问答协议与旧实验结果，供比较，不作为用户对话记忆的成功证据。',
}


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stylesheets = []
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        path = attrs.get('href' if tag == 'link' else 'src', '')
        if not path or path.startswith(('http:', 'https:', '//')):
            return
        if tag == 'link' and attrs.get('rel') == 'stylesheet':
            self.stylesheets.append(path)
        if tag == 'script':
            self.scripts.append(path)


def asset_url(path):
    return path if path.startswith('/') else '/projects/dynamic-weight-qwen/' + path


def prepare():
    for name, description in PAGES.items():
        path = PROJECT / name
        text = path.read_text(encoding='utf-8')
        front = re.match(r'^---\s*\n(.*?)\n---\s*\n', text, re.S)
        if not front:
            raise ValueError(f'{name}: missing front matter')
        if re.search(r'^layout: experiment$', front[1], re.M):
            continue
        title = re.search(r'^title:\s*(.+)$', front[1], re.M).group(1)
        head = re.search(r'<head>(.*?)</head>', text, re.S | re.I).group(1)
        body = re.search(r'<body[^>]*>(.*?)</body>', text, re.S | re.I).group(1).strip()
        assets = Assets(); assets.feed(head)
        body = re.sub(r'<main(\s[^>]*)?>', r'<article\1>', body)
        body = body.replace('</main>', '</article>')
        body = re.sub(r'<header class="report-header">(.*?)</header>',
                      r'<nav class="report-header" aria-label="实验资料">\1</nav>', body, flags=re.S)
        styles = [asset_url(p) for p in assets.stylesheets] + ['/assets/css/experiment.css?v=20261015']
        scripts = [asset_url(p) for p in assets.scripts]
        front_matter = [
            '---', 'layout: experiment', f'title: {title}',
            'body_class: dynamic-memory-page', 'nav_section: projects',
            'description: ' + json.dumps(description, ensure_ascii=False), 'stylesheets:',
            *['  - ' + json.dumps(p) for p in styles], 'scripts:',
            *['  - ' + json.dumps(p) for p in scripts], '---', '',
        ]
        path.write_text('\n'.join(front_matter) + body + '\n', encoding='utf-8')
        print(f'Prepared {name}: {len(styles)} stylesheets, {len(scripts)} scripts')
    # Account for the shared left rail in the historical two-column explainer.
    # The CSS and script must agree on when the example panel becomes a dialog.
    for name in ('report.css', 'report.js'):
        path = PROJECT / name
        text = path.read_text(encoding='utf-8')
        updated = text.replace('max-width:960px', 'max-width:1280px')
        if text != updated:
            path.write_text(updated, encoding='utf-8')
    for path in (PROJECT / 'docs').glob('*.md'):
        text = path.read_text(encoding='utf-8')
        if text.startswith('---\nlayout: default\n') and 'nav_section: projects\n' not in text.split('---', 2)[1]:
            path.write_text(text.replace('layout: default\n', 'layout: default\nnav_section: projects\n', 1), encoding='utf-8')


if __name__ == '__main__':
    prepare()
