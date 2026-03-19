# Piskel MCP Server

[![CI](https://github.com/yafeiaa/piskel-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/yafeiaa/piskel-mcp-server/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

Piskel 像素画编辑器的 MCP（Model Context Protocol）服务器，让 AI 助手能够通过 MCP 协议创建和操作像素画。

[English](./docs/README_en.md) | [简体中文](./docs/README_zh.md)

<img src="./docs/examples/bird_fly.gif" alt="Bird Animation" width="80"> <img src="./docs/examples/heart_icon.gif" alt="Heart" width="80"> <img src="./docs/examples/sword_item.gif" alt="Sword" width="80"> <img src="./docs/examples/treasure_chest.gif" alt="Treasure Chest" width="80"> <img src="./docs/examples/explosion_effect.gif" alt="Explosion" width="80">

## 功能特点

- 创建和管理像素画项目
- 绘制像素、线条、矩形、圆形
- 洪水填充工具
- 图层管理
- 导出为 PNG、GIF 和雪碧图
- 动画帧支持

## 安装

```bash
npm install
npm run build
```

## 快速开始

### 1. 构建

```bash
npm run build
```

### 2. 接入 Agent

服务器使用 stdio 传输协议。将以下配置添加到你的 Agent 设置中：

```json
{
  "mcpServers": {
    "piskel": {
      "command": "node",
      "args": ["/path/to/piskel-mcp-server/dist/index.js"]
    }
  }
}
```

请将 `/path/to/piskel-mcp-server/` 替换为你实际的克隆路径。

### 3. 开始创作！

连接后，你可以用自然语言创建像素画：

```
"创建一个 32x32 的红色爱心精灵图"
"在中心画一个蓝色圆形"
"用绿色填充左半边"
"导出为动画 GIF"
```

## MCP 工具

### 项目管理
- `piskel_create_project` - 创建新像素画项目
- `piskel_list_projects` - 列出所有项目
- `piskel_get_project_info` - 获取项目详情
- `piskel_delete_project` - 删除项目

### 图层管理
- `piskel_add_layer` - 添加新图层
- `piskel_remove_layer` - 移除图层

### 帧管理
- `piskel_add_frame` - 添加新帧
- `piskel_remove_frame` - 移除帧
- `piskel_duplicate_frame` - 复制帧

### 绘图工具
- `piskel_draw_pixel` - 绘制单个像素
- `piskel_draw_pixels` - 绘制多个像素
- `piskel_draw_line` - 绘制线条
- `piskel_draw_rectangle` - 绘制矩形
- `piskel_draw_circle` - 绘制圆形
- `piskel_fill_area` - 洪水填充
- `piskel_erase_pixel` - 擦除像素
- `piskel_clear_frame` - 清空帧

### 数据读取
- `piskel_get_pixel` - 获取像素颜色
- `piskel_get_frame_data` - 获取帧像素数据

### 导出
- `piskel_export_png` - 导出为 PNG
- `piskel_export_gif` - 导出为 GIF
- `piskel_export_sprite_sheet` - 导出为雪碧图

## 贡献指南

开发和 Pull Request 规范请查看 [CONTRIBUTING.md](./docs/CONTRIBUTING_zh.md)。

## 许可证

Apache-2.0

## 致谢

基于 Julian Descottes 创建的 [Piskel](https://github.com/piskelapp/piskel)。

