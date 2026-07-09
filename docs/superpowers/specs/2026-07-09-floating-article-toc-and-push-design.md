# 浮动文章目录与 Git Push 修复设计

## 目标

1. 桌面端文章目录在页面滚动时持续显示在正文左侧上方；
2. 目录不得遮挡页头或正文；
3. 移动端继续使用现有“本文目录”折叠交互；
4. 确认并恢复 `master` 向 GitHub 远端推送的能力。

## 目录问题根因

当前 `position: sticky` 设置在 `.post-toc-list` 上，而它的父级 `.post-toc` 高度基本等于目录列表本身。Sticky 元素只能在其包含块范围内移动，因此父容器没有提供足够的纵向滚动空间，目录无法在整篇文章滚动期间持续吸顶。

## 目录方案

将 sticky 定位职责移到 `.post-toc`：

- `.post-toc` 使用 `position: sticky`、`top: 24px` 和 `align-self: start`；
- `.post-toc-list` 保留最大高度和内部纵向滚动，但不再承担 sticky 定位；
- 桌面端目录仍占据 Grid 左栏，不覆盖正文；
- 初始位置仍跟随文章布局，不覆盖站点页头；
- 滚动后目录停留在视口上方 24px；
- 移动端媒体查询将 `.post-toc` 恢复为 `position: static`，保留折叠行为。

不使用 `position: fixed`，因为 fixed 脱离布局，需要额外计算水平位置，并可能在中等宽度屏幕覆盖正文。不增加 JavaScript 滚动定位逻辑。

## Git Push 诊断结论

远端配置为：

```text
https://github.com/light8lee/light8lee.github.io.git
```

当前诊断结果：

- `git ls-remote origin HEAD` 成功；
- `git fetch origin` 成功；
- Git Credential Manager 能识别 GitHub 账号 `light8lee`；
- `git push --dry-run origin master` 成功；
- 本地 `master` 比 `origin/master` 领先 10 个提交。

因此 remote 地址、账号识别和仓库写入路径当前均正常。此前错误属于临时认证或连接失败，不需要重写 remote 或删除凭据。

## 验证

自动验证：

- Jekyll 构建成功；
- 文章渲染、Markdown 代码、公式和表格检查全部通过；
- CSS 回归检查确认 sticky 位于 `.post-toc`，移动端有 static 覆盖；
- `git push --dry-run origin master` 成功。

浏览器验证：

- 桌面端打开长文章，滚动多个视口后目录仍位于左上方；
- 目录没有覆盖页头或正文；
- 长目录可以独立滚动；
- 移动端目录默认收起，可展开并在选择条目后自动收起；
- 页面没有横向溢出。

完成验证和提交后执行：

```powershell
git push origin master
```
