# Piskel MCP Server

[![CI](https://github.com/yafeiaa/piskel-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/yafeiaa/piskel-mcp-server/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

MCP Server for Piskel pixel art editor. Enables AI assistants to create and manipulate pixel art through the Model Context Protocol.

## Features

- Create and manage pixel art projects
- Draw pixels, lines, rectangles, circles
- Flood fill tool
- Layer management
- Export to PNG, GIF, and sprite sheets
- Animation frame support

## Examples

Gallery of pixel art created with Piskel MCP Server:

| Sprite | Animated GIF | Sprite Sheet |
|--------|-------------|-------------|
| ![Heart Icon](./examples/heart_icon.gif) | ![Heart Animation](./examples/heart_icon_spritesheet.png) | - |
| ![Sword Item](./examples/sword_item.png) | ![Sword Animation](./examples/sword_item.gif) | - |
| ![Treasure Chest](./examples/treasure_chest.gif) | ![Treasure Sheet](./examples/treasure_chest_sheet.png) | - |
| ![Pixel Tree](./examples/pixel_tree.png) | - | - |
| ![Bird Fly](./examples/bird_fly.gif) | - | - |
| ![Explosion](./examples/explosion_effect.gif) | ![Explosion Sheet](./examples/explosion_effect_sheet.png) | - |

## Installation

```bash
git clone https://github.com/yafeiaa/piskel-mcp-server.git
cd piskel-mcp-server
npm install
npm run build
```

## Quick Start

### 1. Build

```bash
npm run build
```

### 2. Connect to Agent

The server uses stdio transport. Add the following configuration to your Agent settings:

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

Replace `/path/to/piskel-mcp-server/` with your actual clone path.

### 3. Start Creating!

Once connected, you can create pixel art using natural language:

```
"Create a 32x32 sprite of a red heart"
"Draw a blue circle in the center"
"Fill the left half with green"
"Export as animated GIF"
```

## MCP Tools

### Project Management
- `piskel_create_project` - Create a new pixel art project
- `piskel_list_projects` - List all projects
- `piskel_get_project_info` - Get project details
- `piskel_delete_project` - Delete a project

### Layer Management
- `piskel_add_layer` - Add a new layer
- `piskel_remove_layer` - Remove a layer

### Frame Management
- `piskel_add_frame` - Add a new frame
- `piskel_remove_frame` - Remove a frame
- `piskel_duplicate_frame` - Duplicate a frame

### Drawing Tools
- `piskel_draw_pixel` - Draw a single pixel
- `piskel_draw_pixels` - Draw multiple pixels
- `piskel_draw_line` - Draw a line
- `piskel_draw_rectangle` - Draw a rectangle
- `piskel_draw_circle` - Draw a circle
- `piskel_fill_area` - Flood fill
- `piskel_erase_pixel` - Erase pixels
- `piskel_clear_frame` - Clear a frame

### Data Reading
- `piskel_get_pixel` - Get pixel color
- `piskel_get_frame_data` - Get frame pixel data

### Export
- `piskel_export_png` - Export as PNG
- `piskel_export_gif` - Export as GIF
- `piskel_export_sprite_sheet` - Export as sprite sheet

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and pull request guidelines.

## License

Apache-2.0

## Acknowledgments

Based on [Piskel](https://github.com/piskelapp/piskel) by Julian Descottes.
