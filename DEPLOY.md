# Piskel MCP Server — Remote HTTP Fork

> Forked from [yafeiaa/piskel-mcp-server](https://github.com/yafeiaa/piskel-mcp-server) with added **Streamable HTTP transport** so it can be hosted remotely and used from **claude.ai** as a connected MCP server.

## What Changed

The original server only supports `stdio` transport (local use with Claude Desktop/Code).
This fork adds:

- **Express HTTP server** with Streamable HTTP transport on `/mcp`
- **CORS support** for cross-origin requests from claude.ai
- **Health check** endpoint at `/health`
- **Environment variable config**: `TRANSPORT=http` and `PORT=3000`
- **Dockerfile** for one-click deployment

The original 43 pixel art tools are **100% preserved** — zero breaking changes.

---

## Quick Start (Local)

```bash
git clone <your-fork-url>
cd piskel-mcp-server
npm install
npm run build

# Run in HTTP mode
TRANSPORT=http PORT=3000 node dist/index.js
```

Test it:
```bash
curl http://localhost:3000/health
```

---

## Deploy to Railway (Recommended — Free Tier)

### Step 1: Push to GitHub
```bash
# Create your own repo on GitHub, then:
git remote set-url origin https://github.com/YOUR_USERNAME/piskel-mcp-server.git
git add -A
git commit -m "Add HTTP transport for remote MCP hosting"
git push origin main
```

### Step 2: Deploy on Railway
1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select your `piskel-mcp-server` repo
4. Railway auto-detects the Dockerfile
5. Add environment variables:
   - `TRANSPORT` = `http`
   - `PORT` = `3000` (Railway sets this automatically via `$PORT`)
6. Click **Deploy**
7. Once deployed, go to **Settings** → **Networking** → **Generate Domain**
8. Your server URL will be: `https://your-app.up.railway.app/mcp`

### Step 3: Connect to Claude.ai
1. Open [claude.ai](https://claude.ai)
2. Go to a conversation → click the **🔌 plug icon** (Integrations)
3. Click **"Add custom integration"** or **"Add MCP server"**
4. Enter your server URL: `https://your-app.up.railway.app/mcp`
5. Done! Claude can now use all 43 Piskel tools.

---

## Deploy to Render (Alternative — Free Tier)

1. Go to [render.com](https://render.com)
2. **New** → **Web Service** → Connect your GitHub repo
3. Settings:
   - **Runtime**: Docker
   - **Environment Variables**: `TRANSPORT=http`
4. Deploy — Render gives you a URL like `https://piskel-mcp.onrender.com`
5. Your MCP endpoint: `https://piskel-mcp.onrender.com/mcp`

---

## Deploy to Fly.io

```bash
# Install flyctl, then:
fly launch --dockerfile Dockerfile
fly secrets set TRANSPORT=http
fly deploy
```

Your MCP endpoint: `https://your-app.fly.dev/mcp`

---

## All 43 Available Tools

### Project Management
| Tool | Description |
|------|-------------|
| `create_project` | Create a new pixel art project |
| `get_project_info` | Get project details |
| `list_projects` | List all active projects |
| `delete_project` | Delete a project |

### Layers
| Tool | Description |
|------|-------------|
| `add_layer` | Add a new layer |
| `remove_layer` | Remove a layer |
| `rename_layer` | Rename a layer |
| `set_layer_opacity` | Set opacity (0.0–1.0) |
| `set_layer_visibility` | Toggle visibility |
| `merge_layers` | Merge two layers |

### Frames & Animation
| Tool | Description |
|------|-------------|
| `add_frame` | Add a new frame |
| `remove_frame` | Remove a frame |
| `duplicate_frame` | Duplicate a frame |
| `move_frame` | Reorder a frame |
| `swap_frames` | Swap two frames |
| `set_fps` | Set animation FPS |

### Drawing
| Tool | Description |
|------|-------------|
| `draw_pixel` | Draw a single pixel |
| `draw_pixels` | Draw multiple pixels at once |
| `draw_line` | Draw a line (Bresenham) |
| `draw_rectangle` | Rectangle (outline or filled) |
| `draw_circle` | Circle/ellipse (outline or filled) |
| `fill_area` | Flood fill (paint bucket) |
| `erase_pixel` | Erase to transparent |
| `clear_frame` | Clear all pixels in a frame |

### Color
| Tool | Description |
|------|-------------|
| `get_pixel` | Get pixel color |
| `get_frame_data` | Get all pixel data as 2D array |
| `get_used_colors` | List unique colors with counts |
| `replace_color` | Replace color A with B (all frames/layers) |
| `swap_colors` | Swap two colors |

### Transform
| Tool | Description |
|------|-------------|
| `flip_horizontal` | Mirror left-right |
| `flip_vertical` | Mirror top-bottom |
| `rotate` | Rotate 90/180/270 degrees |
| `shift_frame` | Shift all pixels by offset |
| `resize_canvas` | Resize with anchor positioning |
| `copy_region` | Copy rectangular region between frames |

### Palette
| Tool | Description |
|------|-------------|
| `create_palette` | Create custom or load preset (pico8, db16, nes, gameboy, etc.) |
| `get_palette` | Get palette colors |
| `list_palettes` | List all palettes |
| `add_palette_color` | Add color to palette |
| `remove_palette_color` | Remove color from palette |

### Export
| Tool | Description |
|------|-------------|
| `export_png` | Export frame as PNG (base64) |
| `export_sprite_sheet` | Export all frames as spritesheet |
| `export_gif` | Export as animated GIF |

---

## Habibi Game — Layer Workflow

For the Habibi character system with 10 layers:

```
Layer 0: Shadow          (dark oval on ground)
Layer 1: Body base       (skin tone silhouette)
Layer 2: Pants/legs      (trousers)
Layer 3: Shoes           (footwear)
Layer 4: Torso clothing  (shirt + logo)
Layer 5: Head shape      (skin-colored oval)
Layer 6: Eyes + mouth    (facial expression)
Layer 7: Hair            (hairstyle)
Layer 8: Accessory top   (hats, glasses)
Layer 9: Held item       (bag, drink, phone)
```

### Example workflow via Claude:
```
"Create a 64x64 project called habibi_char1"
"Add 10 layers: shadow, body_base, pants, shoes, torso, head, face, hair, accessory, held_item"
"On the body_base layer, draw the skin silhouette in #D4A574"
"On the torso layer, draw a blue t-shirt replacing the red one"
"Export as spritesheet"
```

Claude will call the MCP tools automatically.

---

## Transport Modes

| Mode | Env Var | Use Case |
|------|---------|----------|
| `stdio` | `TRANSPORT=stdio` (default) | Claude Desktop, Claude Code |
| `http` | `TRANSPORT=http` | Railway, Render, Fly.io → claude.ai |

---

## License

Apache-2.0 — Same as the original Piskel MCP Server.
Based on [Piskel](https://github.com/piskelapp/piskel) by Julian Descottes.
