# LiteDoc Browser AppGallery 上架材料草稿

## 基本信息

- 应用名称：LiteDoc Browser
- 包名：com.pzhcyh.litedocbrowser
- 版本号：0.1.0
- 版本代码：1
- 应用分类建议：工具
- 支持设备：手机、平板
- 目标用户：需要快速查看本地 HTML / Markdown 文档的个人用户

## 一句话简介

轻量本地文档浏览器，快速打开 HTML 和 Markdown 文件。

## 应用介绍

LiteDoc Browser 是一个轻量的本地文档浏览工具，专注于快速查看 HTML 和 Markdown 文件。应用支持从文件管理器通过“打开方式”直接打开文档，也可以在应用内选择本地文件查看。

当前版本默认暗色模式，并支持明暗主题切换，适合在手机和平板上阅读技术文档、知识库导出页面、AI 生成的 HTML 报告和 Markdown 笔记。

## 主要功能

- 查看本地 `.html` / `.htm` 文件
- 查看本地 `.md` / `.markdown` 文件
- 支持从系统文件管理器“打开方式”进入
- 支持应用内选择文件
- 默认暗色模式
- 支持白天/暗夜模式切换
- 适配手机和平板屏幕阅读

## 版本说明

0.1.0

- 首个鸿蒙移动端测试版本。
- 支持打开本地 HTML 和 Markdown 文件。
- 支持文件管理器“打开方式”调用。
- 支持明暗主题切换。

## 权限与数据说明

LiteDoc Browser 仅在用户主动选择或通过系统“打开方式”传入文件时读取对应本地文件内容，用于在设备本地渲染显示。

应用当前不需要用户注册登录，不采集个人身份信息，不上传文件内容，不提供云同步功能，不内置广告和统计 SDK。

## 隐私政策链接

待发布到公开 URL 后填写。草稿见：

```text
docs/appgallery/privacy-policy.md
```

建议后续通过 GitHub Pages 或个人网站发布为网页链接。

## 截图建议

至少准备 3 张手机截图：

1. 应用首页，展示 Open 按钮和暗色主题。
2. 打开 Markdown 文件后的阅读界面。
3. 打开 HTML 文件后的阅读界面。

可选平板截图：

1. 平板横屏或大屏阅读效果。
2. 白天模式阅读效果。

## 提交前检查

- 确认应用名称、图标、包名一致。
- 使用正式发布证书签名。
- 确认 `.app` 包可上传至 AppGallery Connect。
- 确认隐私政策链接可公网访问。
- 确认截图无敏感信息。
- 确认应用内没有调试日志、测试文案或无关文件。

## 官方入口

- 华为应用市场分发入口：https://developer.huawei.com/consumer/cn/appgallery/devstart/
- AppGallery Connect：https://developer.huawei.com/consumer/cn/agconnect/
