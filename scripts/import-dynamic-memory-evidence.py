"""Export the recorded experiment evidence; does not run or retrain models.

Usage: python scripts/import-dynamic-memory-evidence.py SOURCE_PROJECT
"""
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys

source = Path(sys.argv[1]).resolve()
target = Path(__file__).resolve().parents[1] / 'projects/dynamic-weight-qwen'
artifacts = source / 'experiments/artifacts'
(target / 'evidence').mkdir(parents=True, exist_ok=True)
manifest = []

def load(run):
    original = artifacts / run / 'results.json'
    name = run.replace('/', '--') + '.json'
    shutil.copyfile(original, target / 'evidence' / name)
    manifest.append({'run': run, 'file': 'evidence/' + name,
                     'sha256': hashlib.sha256(original.read_bytes()).hexdigest()})
    return json.loads(original.read_text(encoding='utf-8'))

initial = load('retention-scale-30')
kv = load('retention-scale-30-kv-corrected')
models = {name: load(run) for name, run in {
    '0.6B': 'retention-scale-30-qwen3-0.6b-entity-gate',
    '1.7B': 'retention-scale-30-qwen3-1.7b-entity-gate',
    '4B-FP8': 'retention-scale-30-qwen3-4b-fp8-entity-gate'}.items()}
method_ids = list(initial['summary'])
probe = {method: load('open-benchmark-methods/' + method) for method in method_ids}
stress = load('random-stress-3x60-v3')
visual = load('visual-memory-48')
calibrated = load('visual-memory-48-gate-0999')
benchmarks = []
for model, run in [('0.6B', 'open-benchmark-qwen3-0.6b-entity-gate-v2'),
                   ('1.7B', 'open-benchmark-qwen3-1.7b-entity-gate'),
                   ('4B-FP8', 'open-benchmark-qwen3-4b-fp8-entity-gate')]:
    for benchmark, summary in load(run)['summary'].items():
        benchmarks.append(dict(model=model, benchmark=benchmark, **summary))
benchmarks.append(dict(model='VL-2B', benchmark='MMStar', **load('mmstar-before-after')['summary']))
data = {
    'initial': initial['summary'], 'kv': kv['summary']['kv_replay'],
    'models': {name: value['summary']['token_knn'] for name, value in models.items()},
    'probe': {name: value['summary']['MMLU'] for name, value in probe.items()},
    'probeExamples': {name: value['rows'][0] for name, value in probe.items()},
    'recallRows': models['0.6B']['rows'], 'stress': stress['aggregate'],
    'stressSeeds': stress['summary'], 'benchmarks': benchmarks,
    'visual': visual['summary'], 'calibrated': calibrated['summary'],
    'visualRows': [r for r in visual['rows'] if r['stage'] == 'after_write'],
    'calibratedRows': calibrated['rows'], 'sources': manifest,
}
(target / 'evidence.js').write_text('const evidence = ' + json.dumps(data, ensure_ascii=False) + ';\n', encoding='utf-8')
(target / 'evidence/manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
(target / 'images').mkdir(exist_ok=True)
for name in ['memory-000.png', 'memory-001.png', 'memory-002.png', 'unseen-000.png']:
    shutil.copyfile(artifacts / 'visual-memory-48/images' / name, target / 'images' / name)
for path in (source / 'docs').glob('*.md'):
    text = path.read_text(encoding='utf-8')
    title = text.splitlines()[0].lstrip('# ')
    text = re.sub(r'\]\(([^)\s]+)\.md\)', r'](\1.html)', text)
    text = text.replace('../web/dynamic-memory-explorer/index.html', '../index.html')
    header = '---\nlayout: default\ntitle: ' + json.dumps(title, ensure_ascii=False) + '\n---\n\n'
    clarification = ('> 展示口径补充：本报告的 180 条随机事实是三个独立种子各 60 条的合计，不代表同一记忆库同时保存 180 条。视觉门限在已有控制集上校准，尚未证明独立自然图像分布上的泛化。以下保留实验报告正文。\n\n' if path.name == 'comprehensive-experiment-report.md' else '')
    style = '<style>.experiment-document{max-width:1000px;margin:auto;line-height:1.9;overflow-wrap:anywhere}.experiment-document img{max-width:100%;height:auto}.experiment-document pre,.experiment-document table{display:block;overflow:auto}.experiment-document h2{margin-top:2.5em}.experiment-document mjx-container{max-width:100%;overflow-x:auto}</style>\n'
    (target / 'docs' / path.name).write_text(header + style + '<div class="experiment-document" markdown="1">\n\n[← 返回交互实验台](../)\n\n' + clarification + text + '\n</div>\n', encoding='utf-8')
print('Exported', len(manifest), 'evidence files and complete explanatory documents.')
