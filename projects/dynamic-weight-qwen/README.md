# 工坊：Qwen 用户对话记忆实验

- `index.html`：只观察 user 的对话实验、真实回答、统一方法对照和公式。
- `diagnosis.html`：前缀、增益、单概念、门控与地址特征的诊断对照。
- `teacher-qa.html`：历史教师 assistant 问答协议，供比较，不作为用户记忆的成功证据。
- `docs/` 与 `evidence/`：完整说明、图解和原始实验记录。

三份报告使用 `_layouts/experiment.html`，继承全站默认导航、字体、背景和页脚。页面的 `stylesheets`、`scripts` 配置保留各自的交互资源；最后加载 `assets/css/experiment.css` 统一视觉。蓝色原生结构、橙色注入结构、绿色 user 来源的含义保持不变。

`evidence/` 的清单校验导出文件的原始字节。项目内的 `.gitattributes` 禁止 Git 为这些证据文件转换换行，确保提交及再次检出后 SHA-256 不变。

上游实验项目重新导出独立 HTML 后，在网站根目录运行：

```powershell
python scripts/prepare_dynamic_memory_pages.py
```

该步骤保留报告正文、实际数据和控件，只适配站点布局及资源入口，并使历史页的脚本与样式使用相同的响应式断点。站点统一加载一次 MathJax。

`scripts/import-dynamic-memory-evidence.py` 是历史教师问答材料的导入工具。新 user-only 与机制诊断的材料以各自 evidence 子目录中的协议与清单为准；请勿用历史结果覆盖新实验结论。
