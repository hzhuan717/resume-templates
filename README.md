# 简历模板库

免费在线简历模板库：**打开模板 → 点文字直接改 → 自动保存在本机浏览器 → 一键导出 PDF**。

## 访问

- 网站入口：`https://hzhuan717.github.io/resume-templates/`
- 无需注册，数据完全保存在访客自己浏览器的 localStorage 中，本站没有任何后端，不收集任何信息。

## 功能

- 145 个单页简历模板（简约 / 极简 / 双栏 / 商务 / 创意 / 彩色 分类），画廊带实时预览、搜索、分类筛选
- 点字即改、Enter 续行、粘贴自动转纯文本、超页提示
- 证件照上传替换（自动压缩，仅存本机）
- 导出 PDF（打印选"另存为 PDF"、边距"无"）、导出 HTML
- JSON 备份 / 导入，跨设备迁移简历

## 本地使用

```bash
python -m http.server 8000
# 打开 http://127.0.0.1:8000/
```

也可以直接部署到任意静态托管（GitHub Pages / Netlify / Vercel / Gitee Pages）。

## 目录结构

```
index.html            画廊首页（模板列表 / 搜索 / 预览）
assets/editor.js      共用编辑器（工具条 / 自动保存 / 照片 / 导入导出）
assets/templates.json 模板清单（画廊数据源）
assets/avatar.svg     默认证件照占位图
templates/*.html      145 个可编辑模板，每个都是独立单文件
```

## 说明

- 模板内容均为示例数据，使用时自行替换。
- 模板仅供个人求职使用。
- 基于 Word 版式转换生成，个别复杂装饰元素为近似实现。
