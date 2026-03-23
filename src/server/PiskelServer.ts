/**
 * MCP Server implementation for Piskel pixel art operations.
 *
 * This file is part of Piskel MCP Server.
 * Based on Piskel (https://github.com/piskelapp/piskel)
 * Original code Copyright (C) 2011-2016 Julian Descottes
 * Licensed under Apache License 2.0
 *
 * Modifications: Converted to TypeScript MCP Server.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';

import { Frame } from '../core/Frame.js';
import { Layer } from '../core/Layer.js';
import { Piskel } from '../core/Piskel.js';
import { Palette, getPresetPalette, listPresetPalettes } from '../core/Palette.js';
import { intToHex, colorToInt } from '../core/color.js';
import {
  drawPixel,
  drawLine,
  drawRectangle,
  drawFilledRectangle,
  drawCircle,
  drawFilledCircle,
  fillArea,
  erasePixel,
  replaceColor,
  swapColors,
} from '../tools/drawing.js';
import {
  flipHorizontal,
  flipVertical,
  rotate90CW,
  rotate90CCW,
  rotate180,
  shiftFrame,
  applyTransformToFrame,
  applyTransformToLayer,
} from '../tools/transform.js';
import {
  exportSpriteSheetAsPNG,
  exportMergedFrameAsPNG,
  exportAsGIF,
} from '../export/index.js';

/**
 * Piskel MCP Server
 */
export class PiskelServer {
  private server: Server;
  private projects: Map<string, Piskel> = new Map();
  private palettes: Map<string, Palette> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'piskel-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: this.getTools() };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return this.handleToolCall(request.params.name, request.params.arguments ?? {});
    });
  }

  private getTools(): Tool[] {
    return [
      // Project management
      {
        name: 'create_project',
        description: 'Create a new pixel art project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Unique identifier for the project',
            },
            width: {
              type: 'number',
              description: 'Canvas width in pixels',
            },
            height: {
              type: 'number',
              description: 'Canvas height in pixels',
            },
            name: {
              type: 'string',
              description: 'Project name (optional)',
            },
          },
          required: ['projectId', 'width', 'height'],
        },
      },
      {
        name: 'get_project_info',
        description: 'Get information about a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all active projects',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'delete_project',
        description: 'Delete a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
          },
          required: ['projectId'],
        },
      },

      // Layer management
      {
        name: 'add_layer',
        description: 'Add a new layer to the project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerName: {
              type: 'string',
              description: 'Name for the new layer',
            },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'remove_layer',
        description: 'Remove a layer from the project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Index of the layer to remove',
            },
          },
          required: ['projectId', 'layerIndex'],
        },
      },

      // Frame management
      {
        name: 'add_frame',
        description: 'Add a new frame to a layer',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Index of the layer (default: 0)',
            },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'remove_frame',
        description: 'Remove a frame from all layers',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            frameIndex: {
              type: 'number',
              description: 'Index of the frame to remove',
            },
          },
          required: ['projectId', 'frameIndex'],
        },
      },
      {
        name: 'duplicate_frame',
        description: 'Duplicate a frame',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            frameIndex: {
              type: 'number',
              description: 'Index of the frame to duplicate',
            },
          },
          required: ['projectId', 'frameIndex'],
        },
      },

      // Drawing tools
      {
        name: 'draw_pixel',
        description: 'Draw a single pixel',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
            x: {
              type: 'number',
              description: 'X coordinate',
            },
            y: {
              type: 'number',
              description: 'Y coordinate',
            },
            color: {
              type: 'string',
              description: 'Color in hex format (e.g., "#FF0000" or "rgba(255,0,0,1)")',
            },
          },
          required: ['projectId', 'x', 'y', 'color'],
        },
      },
      {
      name: 'draw_pixels',
        description: 'Draw multiple pixels at once. Supports single color for all pixels, or per-pixel colors.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
            pixels: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                  color: { type: 'string', description: 'Per-pixel color in hex format (optional, overrides global color)' },
                },
                required: ['x', 'y'],
              },
              description: 'Array of pixel coordinates with optional per-pixel colors',
            },
            color: {
              type: 'string',
              description: 'Default color in hex format (used when pixel has no individual color)',
            },
          },
          required: ['projectId', 'pixels'],
        },
      },
      {
        name: 'draw_line',
        description: 'Draw a line between two points',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
            x0: {
              type: 'number',
              description: 'Start X coordinate',
            },
            y0: {
              type: 'number',
              description: 'Start Y coordinate',
            },
            x1: {
              type: 'number',
              description: 'End X coordinate',
            },
            y1: {
              type: 'number',
              description: 'End Y coordinate',
            },
            color: {
              type: 'string',
              description: 'Color in hex format',
            },
            penSize: {
              type: 'number',
              description: 'Pen size (default: 1)',
            },
          },
          required: ['projectId', 'x0', 'y0', 'x1', 'y1', 'color'],
        },
      },
      {
        name: 'draw_rectangle',
        description: 'Draw a rectangle (outline or filled)',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
            x0: {
              type: 'number',
              description: 'Top-left X coordinate',
            },
            y0: {
              type: 'number',
              description: 'Top-left Y coordinate',
            },
            x1: {
              type: 'number',
              description: 'Bottom-right X coordinate',
            },
            y1: {
              type: 'number',
              description: 'Bottom-right Y coordinate',
            },
            color: {
              type: 'string',
              description: 'Color in hex format',
            },
            filled: {
              type: 'boolean',
              description: 'Whether to fill the rectangle (default: false)',
            },
            penSize: {
              type: 'number',
              description: 'Stroke width for outline (default: 1)',
            },
          },
          required: ['projectId', 'x0', 'y0', 'x1', 'y1', 'color'],
        },
      },
      {
      name: 'draw_circle',
        description: 'Draw a circle/ellipse (outline or filled). Supports two modes: bounding box (x0,y0,x1,y1) or center+radius (centerX,centerY,radiusX,radiusY).',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
            x0: {
              type: 'number',
              description: 'Bounding box top-left X (use with y0,x1,y1)',
            },
            y0: {
              type: 'number',
              description: 'Bounding box top-left Y',
            },
            x1: {
              type: 'number',
              description: 'Bounding box bottom-right X',
            },
            y1: {
              type: 'number',
              description: 'Bounding box bottom-right Y',
            },
            centerX: {
              type: 'number',
              description: 'Center X coordinate (alternative to bounding box)',
            },
            centerY: {
              type: 'number',
              description: 'Center Y coordinate (alternative to bounding box)',
            },
            radiusX: {
              type: 'number',
              description: 'Horizontal radius (for circle, same as radiusY)',
            },
            radiusY: {
              type: 'number',
              description: 'Vertical radius (defaults to radiusX for a perfect circle)',
            },
            color: {
              type: 'string',
              description: 'Color in hex format',
            },
            filled: {
              type: 'boolean',
              description: 'Whether to fill the circle (default: false)',
            },
            penSize: {
              type: 'number',
              description: 'Stroke width for outline (default: 1)',
            },
          },
          required: ['projectId', 'color'],
        },
      },
      {
        name: 'fill_area',
        description: 'Fill a connected area with a color (paint bucket)',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
            x: {
              type: 'number',
              description: 'X coordinate to start fill',
            },
            y: {
              type: 'number',
              description: 'Y coordinate to start fill',
            },
            color: {
              type: 'string',
              description: 'Fill color in hex format',
            },
          },
          required: ['projectId', 'x', 'y', 'color'],
        },
      },
      {
        name: 'erase_pixel',
        description: 'Erase pixels (set to transparent)',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
            x: {
              type: 'number',
              description: 'X coordinate',
            },
            y: {
              type: 'number',
              description: 'Y coordinate',
            },
            penSize: {
              type: 'number',
              description: 'Eraser size (default: 1)',
            },
          },
          required: ['projectId', 'x', 'y'],
        },
      },

      // Pixel reading
      {
        name: 'get_pixel',
        description: 'Get the color of a pixel',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
            x: {
              type: 'number',
              description: 'X coordinate',
            },
            y: {
              type: 'number',
              description: 'Y coordinate',
            },
          },
          required: ['projectId', 'x', 'y'],
        },
      },
      {
        name: 'get_frame_data',
        description: 'Get all pixel data from a frame as a 2D array',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
          },
          required: ['projectId'],
        },
      },

      // Export
      {
        name: 'export_png',
        description: 'Export a frame as PNG',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
            outputPath: {
              type: 'string',
              description: 'Output file path',
            },
            scale: {
              type: 'number',
              description: 'Scale factor for output (default: 1, e.g., 4 means 4x size)',
            },
          },
          required: ['projectId', 'outputPath'],
        },
      },
      {
        name: 'export_sprite_sheet',
        description: 'Export all frames as a sprite sheet PNG',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            outputPath: {
              type: 'string',
              description: 'Output file path',
            },
            columns: {
              type: 'number',
              description: 'Number of columns in the sprite sheet (optional)',
            },
            scale: {
              type: 'number',
              description: 'Scale factor for output (default: 1)',
            },
          },
          required: ['projectId', 'outputPath'],
        },
      },
      {
        name: 'export_gif',
        description: 'Export as animated GIF',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            outputPath: {
              type: 'string',
              description: 'Output file path',
            },
            frameDelay: {
              type: 'number',
              description: 'Delay between frames in milliseconds (default: 100)',
            },
            scale: {
              type: 'number',
              description: 'Scale factor for output (default: 1)',
            },
          },
          required: ['projectId', 'outputPath'],
        },
      },
      {
        name: 'clear_frame',
        description: 'Clear all pixels in a frame',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
          },
          required: ['projectId'],
        },
      },

      // Color tools
      {
        name: 'replace_color',
        description: 'Replace all occurrences of a color with another color. Can operate on a single frame, all frames, or all layers.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
            oldColor: {
              type: 'string',
              description: 'Color to replace (hex format)',
            },
            newColor: {
              type: 'string',
              description: 'Replacement color (hex format)',
            },
            allFrames: {
              type: 'boolean',
              description: 'Apply to all frames in the layer (default: false)',
            },
            allLayers: {
              type: 'boolean',
              description: 'Apply to all layers and all frames (default: false, overrides layerIndex/frameIndex/allFrames)',
            },
          },
          required: ['projectId', 'oldColor', 'newColor'],
        },
      },
      {
        name: 'swap_colors',
        description: 'Swap two colors in a frame (A becomes B, B becomes A). Can operate on all frames/layers.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
            colorA: {
              type: 'string',
              description: 'First color (hex format)',
            },
            colorB: {
              type: 'string',
              description: 'Second color (hex format)',
            },
            allFrames: {
              type: 'boolean',
              description: 'Apply to all frames in the layer (default: false)',
            },
            allLayers: {
              type: 'boolean',
              description: 'Apply to all layers and all frames (default: false)',
            },
          },
          required: ['projectId', 'colorA', 'colorB'],
        },
      },

      // Transform tools
      {
        name: 'flip_horizontal',
        description: 'Flip a frame horizontally (mirror left-right). Supports applying to all frames.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
            allFrames: {
              type: 'boolean',
              description: 'Apply to all frames in the layer (default: false)',
            },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'flip_vertical',
        description: 'Flip a frame vertically (mirror top-bottom). Supports applying to all frames.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
            allFrames: {
              type: 'boolean',
              description: 'Apply to all frames in the layer (default: false)',
            },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'rotate',
        description: 'Rotate a frame by 90, 180, or 270 degrees. Supports applying to all frames. Note: 90/270 rotation on non-square frames will swap width and height.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
            angle: {
              type: 'number',
              description: 'Rotation angle: 90 (clockwise), 180, or 270 (counter-clockwise)',
            },
            allFrames: {
              type: 'boolean',
              description: 'Apply to all frames in the layer (default: false)',
            },
          },
          required: ['projectId', 'angle'],
        },
      },
      {
        name: 'shift_frame',
        description: 'Shift/move all pixels in a frame by a given offset. Supports applying to all frames.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
            dx: {
              type: 'number',
              description: 'Horizontal shift (positive = right)',
            },
            dy: {
              type: 'number',
              description: 'Vertical shift (positive = down)',
            },
            wrap: {
              type: 'boolean',
              description: 'Wrap pixels around edges (default: true)',
            },
            allFrames: {
              type: 'boolean',
              description: 'Apply to all frames in the layer (default: false)',
            },
          },
          required: ['projectId', 'dx', 'dy'],
        },
      },

      // Frame reordering
      {
        name: 'move_frame',
        description: 'Move a frame to a new position in the animation sequence',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            fromIndex: {
              type: 'number',
              description: 'Current frame index',
            },
            toIndex: {
              type: 'number',
              description: 'Target frame index',
            },
          },
          required: ['projectId', 'fromIndex', 'toIndex'],
        },
      },
      {
        name: 'swap_frames',
        description: 'Swap two frames in the animation sequence',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            frameIndexA: {
              type: 'number',
              description: 'First frame index',
            },
            frameIndexB: {
              type: 'number',
              description: 'Second frame index',
            },
          },
          required: ['projectId', 'frameIndexA', 'frameIndexB'],
        },
      },

      // Layer enhancement
      {
        name: 'rename_layer',
        description: 'Rename a layer',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Index of the layer',
            },
            name: {
              type: 'string',
              description: 'New name for the layer',
            },
          },
          required: ['projectId', 'layerIndex', 'name'],
        },
      },
      {
        name: 'set_layer_opacity',
        description: 'Set the opacity of a layer (0.0 to 1.0)',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Index of the layer',
            },
            opacity: {
              type: 'number',
              description: 'Opacity value (0.0 = fully transparent, 1.0 = fully opaque)',
            },
          },
          required: ['projectId', 'layerIndex', 'opacity'],
        },
      },
      {
        name: 'set_layer_visibility',
        description: 'Toggle layer visibility on/off',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Index of the layer',
            },
            visible: {
              type: 'boolean',
              description: 'Whether the layer is visible',
            },
          },
          required: ['projectId', 'layerIndex', 'visible'],
        },
      },
      {
        name: 'merge_layers',
        description: 'Merge two layers into one. The source layer is merged down into the target layer.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            sourceLayerIndex: {
              type: 'number',
              description: 'Index of the source layer (will be removed after merge)',
            },
            targetLayerIndex: {
              type: 'number',
              description: 'Index of the target layer (will receive merged pixels)',
            },
          },
          required: ['projectId', 'sourceLayerIndex', 'targetLayerIndex'],
        },
      },

      // Palette management
      {
        name: 'create_palette',
        description: 'Create a new color palette or load a preset palette (pico8, db16, db32, nes, gameboy, cga, endesga32, sweetie16)',
        inputSchema: {
          type: 'object',
          properties: {
            paletteId: {
              type: 'string',
              description: 'Unique identifier for the palette',
            },
            name: {
              type: 'string',
              description: 'Palette name (optional)',
            },
            colors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of colors in hex format (optional)',
            },
            preset: {
              type: 'string',
              description: 'Load a preset palette by key: pico8, db16, db32, nes, gameboy, cga, endesga32, sweetie16',
            },
          },
          required: ['paletteId'],
        },
      },
      {
        name: 'get_palette',
        description: 'Get palette information and colors',
        inputSchema: {
          type: 'object',
          properties: {
            paletteId: {
              type: 'string',
              description: 'Palette identifier',
            },
          },
          required: ['paletteId'],
        },
      },
      {
        name: 'list_palettes',
        description: 'List all custom palettes and available presets',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'add_palette_color',
        description: 'Add a color to a palette',
        inputSchema: {
          type: 'object',
          properties: {
            paletteId: {
              type: 'string',
              description: 'Palette identifier',
            },
            color: {
              type: 'string',
              description: 'Color in hex format',
            },
          },
          required: ['paletteId', 'color'],
        },
      },
      {
        name: 'remove_palette_color',
        description: 'Remove a color from a palette',
        inputSchema: {
          type: 'object',
          properties: {
            paletteId: {
              type: 'string',
              description: 'Palette identifier',
            },
            color: {
              type: 'string',
              description: 'Color in hex format to remove',
            },
          },
          required: ['paletteId', 'color'],
        },
      },

      // Canvas tools
      {
        name: 'resize_canvas',
        description: 'Resize the canvas of a project. Existing pixels are preserved and positioned at the given anchor point.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            newWidth: {
              type: 'number',
              description: 'New canvas width in pixels',
            },
            newHeight: {
              type: 'number',
              description: 'New canvas height in pixels',
            },
            anchor: {
              type: 'string',
              description: 'Anchor position for existing content: top-left, top-center, top-right, middle-left, center, middle-right, bottom-left, bottom-center, bottom-right (default: center)',
            },
          },
          required: ['projectId', 'newWidth', 'newHeight'],
        },
      },
      {
        name: 'copy_region',
        description: 'Copy a rectangular region from one frame to another (same or different layer). Useful for animation workflows.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            srcLayerIndex: {
              type: 'number',
              description: 'Source layer index (default: 0)',
            },
            srcFrameIndex: {
              type: 'number',
              description: 'Source frame index (default: 0)',
            },
            srcX: {
              type: 'number',
              description: 'Source region top-left X (default: 0)',
            },
            srcY: {
              type: 'number',
              description: 'Source region top-left Y (default: 0)',
            },
            srcWidth: {
              type: 'number',
              description: 'Source region width (default: full width)',
            },
            srcHeight: {
              type: 'number',
              description: 'Source region height (default: full height)',
            },
            dstLayerIndex: {
              type: 'number',
              description: 'Destination layer index (default: same as source)',
            },
            dstFrameIndex: {
              type: 'number',
              description: 'Destination frame index',
            },
            dstX: {
              type: 'number',
              description: 'Destination top-left X (default: 0)',
            },
            dstY: {
              type: 'number',
              description: 'Destination top-left Y (default: 0)',
            },
          },
          required: ['projectId', 'dstFrameIndex'],
        },
      },

      // Analytics tools
      {
        name: 'get_used_colors',
        description: 'Get a list of all unique colors used in a frame with pixel counts. Useful for palette analysis and color management.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            layerIndex: {
              type: 'number',
              description: 'Layer index (default: 0)',
            },
            frameIndex: {
              type: 'number',
              description: 'Frame index (default: 0)',
            },
          },
          required: ['projectId'],
        },
      },

      // Animation settings
      {
        name: 'set_fps',
        description: 'Set the animation frames per second for a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project identifier',
            },
            fps: {
              type: 'number',
              description: 'Frames per second (1-60)',
            },
          },
          required: ['projectId', 'fps'],
        },
      },
    ];
  }

  private async handleToolCall(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const result = await this.executeToolCall(name, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: errorMessage }),
          },
        ],
      };
    }
  }

  private async executeToolCall(
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    switch (name) {
      // Project management
      case 'create_project':
        return this.createProject(
          args.projectId as string,
          args.width as number,
          args.height as number,
          args.name as string | undefined
        );

      case 'get_project_info':
        return this.getProjectInfo(args.projectId as string);

      case 'list_projects':
        return this.listProjects();

      case 'delete_project':
        return this.deleteProject(args.projectId as string);

      // Layer management
      case 'add_layer':
        return this.addLayer(
          args.projectId as string,
          args.layerName as string | undefined
        );

      case 'remove_layer':
        return this.removeLayer(
          args.projectId as string,
          args.layerIndex as number
        );

      // Frame management
      case 'add_frame':
        return this.addFrame(
          args.projectId as string,
          (args.layerIndex as number) ?? 0
        );

      case 'remove_frame':
        return this.removeFrame(
          args.projectId as string,
          args.frameIndex as number
        );

      case 'duplicate_frame':
        return this.duplicateFrame(
          args.projectId as string,
          args.frameIndex as number
        );

      // Drawing tools
      case 'draw_pixel':
        return this.drawPixelTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0,
          args.x as number,
          args.y as number,
          args.color as string
        );

      case 'draw_pixels':
        return this.drawPixelsTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0,
          args.pixels as Array<{ x: number; y: number; color?: string }>,
          args.color as string | undefined
        );

      case 'draw_line':
        return this.drawLineTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0,
          args.x0 as number,
          args.y0 as number,
          args.x1 as number,
          args.y1 as number,
          args.color as string,
          (args.penSize as number) ?? 1
        );

      case 'draw_rectangle':
        return this.drawRectangleTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0,
          args.x0 as number,
          args.y0 as number,
          args.x1 as number,
          args.y1 as number,
          args.color as string,
          (args.filled as boolean) ?? false,
          (args.penSize as number) ?? 1
        );

      case 'draw_circle':
        return this.drawCircleTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0,
          args.x0 as number | undefined,
          args.y0 as number | undefined,
          args.x1 as number | undefined,
          args.y1 as number | undefined,
          args.color as string,
          (args.filled as boolean) ?? false,
          (args.penSize as number) ?? 1,
          args.centerX as number | undefined,
          args.centerY as number | undefined,
          args.radiusX as number | undefined,
          args.radiusY as number | undefined
        );

      case 'fill_area':
        return this.fillAreaTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0,
          args.x as number,
          args.y as number,
          args.color as string
        );

      case 'erase_pixel':
        return this.erasePixelTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0,
          args.x as number,
          args.y as number,
          (args.penSize as number) ?? 1
        );

      case 'get_pixel':
        return this.getPixelTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0,
          args.x as number,
          args.y as number
        );

      case 'get_frame_data':
        return this.getFrameDataTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0
        );

      case 'clear_frame':
        return this.clearFrameTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0
        );

      // Export
      case 'export_png':
        return this.exportPNG(
          args.projectId as string,
          (args.frameIndex as number) ?? 0,
          args.outputPath as string,
          (args.scale as number) ?? 1
        );

      case 'export_sprite_sheet':
        return this.exportSpriteSheet(
          args.projectId as string,
          args.outputPath as string,
          args.columns as number | undefined,
          (args.scale as number) ?? 1
        );

      case 'export_gif':
        return this.exportGIF(
          args.projectId as string,
          args.outputPath as string,
          (args.frameDelay as number) ?? 100,
          (args.scale as number) ?? 1
        );

      // Color tools
      case 'replace_color':
        return this.replaceColorTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0,
          args.oldColor as string,
          args.newColor as string,
          (args.allFrames as boolean) ?? false,
          (args.allLayers as boolean) ?? false
        );

      case 'swap_colors':
        return this.swapColorsTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0,
          args.colorA as string,
          args.colorB as string,
          (args.allFrames as boolean) ?? false,
          (args.allLayers as boolean) ?? false
        );

      // Transform tools
      case 'flip_horizontal':
        return this.flipHorizontalTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0,
          (args.allFrames as boolean) ?? false
        );

      case 'flip_vertical':
        return this.flipVerticalTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0,
          (args.allFrames as boolean) ?? false
        );

      case 'rotate':
        return this.rotateTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0,
          args.angle as number,
          (args.allFrames as boolean) ?? false
        );

      case 'shift_frame':
        return this.shiftFrameTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0,
          args.dx as number,
          args.dy as number,
          (args.wrap as boolean) ?? true,
          (args.allFrames as boolean) ?? false
        );

      // Frame reordering
      case 'move_frame':
        return this.moveFrameTool(
          args.projectId as string,
          args.fromIndex as number,
          args.toIndex as number
        );

      case 'swap_frames':
        return this.swapFramesTool(
          args.projectId as string,
          args.frameIndexA as number,
          args.frameIndexB as number
        );

      // Layer enhancement
      case 'rename_layer':
        return this.renameLayerTool(
          args.projectId as string,
          args.layerIndex as number,
          args.name as string
        );

      case 'set_layer_opacity':
        return this.setLayerOpacityTool(
          args.projectId as string,
          args.layerIndex as number,
          args.opacity as number
        );

      case 'set_layer_visibility':
        return this.setLayerVisibilityTool(
          args.projectId as string,
          args.layerIndex as number,
          args.visible as boolean
        );

      case 'merge_layers':
        return this.mergeLayersTool(
          args.projectId as string,
          args.sourceLayerIndex as number,
          args.targetLayerIndex as number
        );

      // Palette management
      case 'create_palette':
        return this.createPaletteTool(
          args.paletteId as string,
          args.name as string | undefined,
          args.colors as string[] | undefined,
          args.preset as string | undefined
        );

      case 'get_palette':
        return this.getPaletteTool(args.paletteId as string);

      case 'list_palettes':
        return this.listPalettesTool();

      case 'add_palette_color':
        return this.addPaletteColorTool(
          args.paletteId as string,
          args.color as string
        );

      case 'remove_palette_color':
        return this.removePaletteColorTool(
          args.paletteId as string,
          args.color as string
        );

      // Canvas tools
      case 'resize_canvas':
        return this.resizeCanvasTool(
          args.projectId as string,
          args.newWidth as number,
          args.newHeight as number,
          (args.anchor as string) ?? 'center'
        );

      case 'copy_region':
        return this.copyRegionTool(
          args.projectId as string,
          (args.srcLayerIndex as number) ?? 0,
          (args.srcFrameIndex as number) ?? 0,
          args.srcX as number | undefined,
          args.srcY as number | undefined,
          args.srcWidth as number | undefined,
          args.srcHeight as number | undefined,
          args.dstLayerIndex as number | undefined,
          args.dstFrameIndex as number,
          (args.dstX as number) ?? 0,
          (args.dstY as number) ?? 0
        );

      // Analytics tools
      case 'get_used_colors':
        return this.getUsedColorsTool(
          args.projectId as string,
          (args.layerIndex as number) ?? 0,
          (args.frameIndex as number) ?? 0
        );

      // Animation settings
      case 'set_fps':
        return this.setFpsTool(
          args.projectId as string,
          args.fps as number
        );

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // Project management implementations
  private createProject(
    projectId: string,
    width: number,
    height: number,
    name?: string
  ): object {
    if (this.projects.has(projectId)) {
      throw new Error(`Project "${projectId}" already exists`);
    }

    const descriptor = { name: name ?? projectId };
    const piskel = new Piskel(width, height, 1, descriptor);

    // Add a default layer with one frame
    const defaultLayer = new Layer('Layer 0');
    defaultLayer.addFrame(new Frame(width, height));
    piskel.addLayer(defaultLayer);

    this.projects.set(projectId, piskel);

    return {
      success: true,
      projectId,
      width,
      height,
      name: name ?? projectId,
    };
  }

  private getProjectInfo(projectId: string): object {
    const piskel = this.getProject(projectId);
    return {
      projectId,
      name: piskel.getDescriptor().name,
      width: piskel.getWidth(),
      height: piskel.getHeight(),
      fps: piskel.getFPS(),
      layerCount: piskel.getLayerCount(),
      frameCount: piskel.getFrameCount(),
      layers: Array.from({ length: piskel.getLayerCount() }, (_, i) => {
        const layer = piskel.getLayerAt(i);
        return {
          index: i,
          name: layer?.getName() ?? `Layer ${i}`,
          frameCount: layer?.size() ?? 0,
          opacity: layer?.getOpacity() ?? 1,
          visible: layer?.isVisible() ?? true,
        };
      }),
    };
  }

  private listProjects(): object {
    const projects = [];
    for (const [id, piskel] of this.projects) {
      projects.push({
        projectId: id,
        name: piskel.getDescriptor().name,
        width: piskel.getWidth(),
        height: piskel.getHeight(),
      });
    }
    return { projects };
  }

  private deleteProject(projectId: string): object {
    if (!this.projects.has(projectId)) {
      throw new Error(`Project "${projectId}" not found`);
    }
    this.projects.delete(projectId);
    return { success: true, projectId };
  }

  // Layer management implementations
  private addLayer(projectId: string, layerName?: string): object {
    const piskel = this.getProject(projectId);
    const name = layerName ?? `Layer ${piskel.getLayerCount()}`;
    const layer = new Layer(name);

    // Add frames to match existing frame count
    const frameCount = piskel.getFrameCount();
    for (let i = 0; i < frameCount; i++) {
      layer.addFrame(new Frame(piskel.getWidth(), piskel.getHeight()));
    }

    piskel.addLayer(layer);

    return {
      success: true,
      layerIndex: piskel.getLayerCount() - 1,
      layerName: name,
    };
  }

  private removeLayer(projectId: string, layerIndex: number): object {
    const piskel = this.getProject(projectId);
    const layer = piskel.getLayerAt(layerIndex);
    if (!layer) {
      throw new Error(`Layer ${layerIndex} not found`);
    }

    piskel.removeLayer(layer);
    return { success: true, layerIndex };
  }

  // Frame management implementations
  private addFrame(projectId: string, _layerIndex: number): object {
    const piskel = this.getProject(projectId);

    // Add frame to all layers
    for (let i = 0; i < piskel.getLayerCount(); i++) {
      const layer = piskel.getLayerAt(i);
      if (layer) {
        layer.addFrame(new Frame(piskel.getWidth(), piskel.getHeight()));
      }
    }

    return {
      success: true,
      frameIndex: piskel.getFrameCount() - 1,
    };
  }

  private removeFrame(projectId: string, frameIndex: number): object {
    const piskel = this.getProject(projectId);

    if (frameIndex < 0 || frameIndex >= piskel.getFrameCount()) {
      throw new Error(`Frame index ${frameIndex} out of range`);
    }

    // Remove frame from all layers
    for (let i = 0; i < piskel.getLayerCount(); i++) {
      const layer = piskel.getLayerAt(i);
      if (layer) {
        layer.removeFrameAt(frameIndex);
      }
    }

    return { success: true, frameIndex };
  }

  private duplicateFrame(projectId: string, frameIndex: number): object {
    const piskel = this.getProject(projectId);

    if (frameIndex < 0 || frameIndex >= piskel.getFrameCount()) {
      throw new Error(`Frame index ${frameIndex} out of range`);
    }

    // Duplicate frame in all layers
    for (let i = 0; i < piskel.getLayerCount(); i++) {
      const layer = piskel.getLayerAt(i);
      if (layer) {
        const frame = layer.getFrameAt(frameIndex);
        if (frame) {
          layer.addFrame(frame.clone());
        }
      }
    }

    return {
      success: true,
      sourceFrameIndex: frameIndex,
      newFrameIndex: piskel.getFrameCount() - 1,
    };
  }

  // Drawing tool implementations
  private drawPixelTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number,
    x: number,
    y: number,
    color: string
  ): object {
    const frame = this.getFrame(projectId, layerIndex, frameIndex);
    const success = drawPixel(frame, x, y, color);
    return { success, x, y, color };
  }

  private drawPixelsTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number,
    pixels: Array<{ x: number; y: number; color?: string }>,
    defaultColor?: string
  ): object {
    const frame = this.getFrame(projectId, layerIndex, frameIndex);
    let count = 0;

    for (const pixel of pixels) {
      const color = pixel.color ?? defaultColor;
      if (!color) {
        continue;
      }
      if (frame.containsPixel(pixel.x, pixel.y)) {
        frame.setPixel(pixel.x, pixel.y, colorToInt(color));
        count++;
      }
    }

    return { success: true, pixelsDrawn: count };
  }

  private drawLineTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: string,
    penSize: number
  ): object {
    const frame = this.getFrame(projectId, layerIndex, frameIndex);
    const count = drawLine(frame, x0, y0, x1, y1, color, penSize);
    return { success: true, pixelsDrawn: count };
  }

  private drawRectangleTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: string,
    filled: boolean,
    penSize: number
  ): object {
    const frame = this.getFrame(projectId, layerIndex, frameIndex);
    const count = filled
      ? drawFilledRectangle(frame, x0, y0, x1, y1, color)
      : drawRectangle(frame, x0, y0, x1, y1, color, penSize);
    return { success: true, pixelsDrawn: count };
  }

  private drawCircleTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number,
    x0: number | undefined,
    y0: number | undefined,
    x1: number | undefined,
    y1: number | undefined,
    color: string,
    filled: boolean,
    penSize: number,
    centerX?: number,
    centerY?: number,
    radiusX?: number,
    radiusY?: number
  ): object {
    const frame = this.getFrame(projectId, layerIndex, frameIndex);

    // Support center+radius mode
    let bx0: number, by0: number, bx1: number, by1: number;

    if (centerX !== undefined && centerY !== undefined && radiusX !== undefined) {
      const ry = radiusY ?? radiusX;
      bx0 = centerX - radiusX;
      by0 = centerY - ry;
      bx1 = centerX + radiusX;
      by1 = centerY + ry;
    } else if (x0 !== undefined && y0 !== undefined && x1 !== undefined && y1 !== undefined) {
      bx0 = x0;
      by0 = y0;
      bx1 = x1;
      by1 = y1;
    } else {
      throw new Error('Either (x0,y0,x1,y1) or (centerX,centerY,radiusX) must be provided');
    }

    const count = filled
      ? drawFilledCircle(frame, bx0, by0, bx1, by1, color)
      : drawCircle(frame, bx0, by0, bx1, by1, color, penSize);
    return { success: true, pixelsDrawn: count };
  }

  private fillAreaTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number,
    x: number,
    y: number,
    color: string
  ): object {
    const frame = this.getFrame(projectId, layerIndex, frameIndex);
    const count = fillArea(frame, x, y, color);
    return { success: true, pixelsFilled: count };
  }

  private erasePixelTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number,
    x: number,
    y: number,
    penSize: number
  ): object {
    const frame = this.getFrame(projectId, layerIndex, frameIndex);
    const count = erasePixel(frame, x, y, penSize);
    return { success: true, pixelsErased: count };
  }

  private getPixelTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number,
    x: number,
    y: number
  ): object {
    const frame = this.getFrame(projectId, layerIndex, frameIndex);
    const color = frame.getPixel(x, y);

    if (color === null) {
      return {
        x,
        y,
        color: 'out_of_bounds',
        colorInt: null,
      };
    }

    return {
      x,
      y,
      color: color === 0 ? 'transparent' : intToHex(color),
      colorInt: color,
    };
  }

  private getFrameDataTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number
  ): object {
    const piskel = this.getProject(projectId);
    const frame = this.getFrame(projectId, layerIndex, frameIndex);
    const width = piskel.getWidth();
    const height = piskel.getHeight();
    const pixels = frame.getPixels();

    const data: string[][] = [];
    for (let y = 0; y < height; y++) {
      const row: string[] = [];
      for (let x = 0; x < width; x++) {
        const color = pixels[y * width + x];
        row.push(color === 0 ? 'transparent' : intToHex(color));
      }
      data.push(row);
    }

    return { width, height, data };
  }

  private clearFrameTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number
  ): object {
    const piskel = this.getProject(projectId);
    const frame = this.getFrame(projectId, layerIndex, frameIndex);

    frame.clear();

    return { success: true, pixelsCleared: piskel.getWidth() * piskel.getHeight() };
  }

  // Export implementations
  private exportPNG(
    projectId: string,
    frameIndex: number,
    outputPath: string,
    scale: number = 1
  ): object {
    const piskel = this.getProject(projectId);
    const pngData = exportMergedFrameAsPNG(piskel, frameIndex, scale);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, pngData);

    return {
      success: true,
      outputPath,
      size: pngData.length,
      scale,
    };
  }

  private exportSpriteSheet(
    projectId: string,
    outputPath: string,
    columns?: number,
    scale: number = 1
  ): object {
    const piskel = this.getProject(projectId);
    const pngData = exportSpriteSheetAsPNG(piskel, columns, scale);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, pngData);

    return {
      success: true,
      outputPath,
      size: pngData.length,
      frameCount: piskel.getFrameCount(),
      scale,
    };
  }

  private exportGIF(
    projectId: string,
    outputPath: string,
    frameDelay: number,
    scale: number = 1
  ): object {
    const piskel = this.getProject(projectId);
    const gifData = exportAsGIF(piskel, frameDelay, scale);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, gifData);

    return {
      success: true,
      outputPath,
      size: gifData.length,
      frameCount: piskel.getFrameCount(),
      frameDelay,
      scale,
    };
  }

  // Helper methods
  private getProject(projectId: string): Piskel {
    const piskel = this.projects.get(projectId);
    if (!piskel) {
      throw new Error(`Project "${projectId}" not found`);
    }
    return piskel;
  }

  private getFrame(
    projectId: string,
    layerIndex: number,
    frameIndex: number
  ): Frame {
    const piskel = this.getProject(projectId);
    const layer = piskel.getLayerAt(layerIndex);
    if (!layer) {
      throw new Error(`Layer ${layerIndex} not found`);
    }

    const frame = layer.getFrameAt(frameIndex);
    if (!frame) {
      throw new Error(`Frame ${frameIndex} not found`);
    }

    return frame;
  }

  // Color tool implementations
  private replaceColorTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number,
    oldColor: string,
    newColor: string,
    allFrames: boolean = false,
    allLayers: boolean = false
  ): object {
    const piskel = this.getProject(projectId);
    let totalCount = 0;

    if (allLayers) {
      for (let li = 0; li < piskel.getLayerCount(); li++) {
        const layer = piskel.getLayerAt(li);
        if (!layer) continue;
        for (let fi = 0; fi < layer.size(); fi++) {
          const frame = layer.getFrameAt(fi);
          if (frame) totalCount += replaceColor(frame, oldColor, newColor);
        }
      }
    } else if (allFrames) {
      const layer = piskel.getLayerAt(layerIndex);
      if (!layer) throw new Error(`Layer ${layerIndex} not found`);
      for (let fi = 0; fi < layer.size(); fi++) {
        const frame = layer.getFrameAt(fi);
        if (frame) totalCount += replaceColor(frame, oldColor, newColor);
      }
    } else {
      const frame = this.getFrame(projectId, layerIndex, frameIndex);
      totalCount = replaceColor(frame, oldColor, newColor);
    }

    return { success: true, pixelsChanged: totalCount, oldColor, newColor, allFrames, allLayers };
  }

  private swapColorsTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number,
    colorA: string,
    colorB: string,
    allFrames: boolean = false,
    allLayers: boolean = false
  ): object {
    const piskel = this.getProject(projectId);
    let totalCount = 0;

    if (allLayers) {
      for (let li = 0; li < piskel.getLayerCount(); li++) {
        const layer = piskel.getLayerAt(li);
        if (!layer) continue;
        for (let fi = 0; fi < layer.size(); fi++) {
          const frame = layer.getFrameAt(fi);
          if (frame) totalCount += swapColors(frame, colorA, colorB);
        }
      }
    } else if (allFrames) {
      const layer = piskel.getLayerAt(layerIndex);
      if (!layer) throw new Error(`Layer ${layerIndex} not found`);
      for (let fi = 0; fi < layer.size(); fi++) {
        const frame = layer.getFrameAt(fi);
        if (frame) totalCount += swapColors(frame, colorA, colorB);
      }
    } else {
      const frame = this.getFrame(projectId, layerIndex, frameIndex);
      totalCount = swapColors(frame, colorA, colorB);
    }

    return { success: true, pixelsChanged: totalCount, colorA, colorB, allFrames, allLayers };
  }

  // Transform tool implementations
  private flipHorizontalTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number,
    allFrames: boolean = false
  ): object {
    const piskel = this.getProject(projectId);
    const layer = piskel.getLayerAt(layerIndex);
    if (!layer) throw new Error(`Layer ${layerIndex} not found`);

    let framesProcessed = 0;
    const startIdx = allFrames ? 0 : frameIndex;
    const endIdx = allFrames ? layer.size() : frameIndex + 1;

    for (let fi = startIdx; fi < endIdx; fi++) {
      const frame = layer.getFrameAt(fi);
      if (frame) {
        const transformed = flipHorizontal(frame);
        applyTransformToFrame(frame, transformed);
        framesProcessed++;
      }
    }

    return { success: true, transform: 'flip_horizontal', framesProcessed };
  }

  private flipVerticalTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number,
    allFrames: boolean = false
  ): object {
    const piskel = this.getProject(projectId);
    const layer = piskel.getLayerAt(layerIndex);
    if (!layer) throw new Error(`Layer ${layerIndex} not found`);

    let framesProcessed = 0;
    const startIdx = allFrames ? 0 : frameIndex;
    const endIdx = allFrames ? layer.size() : frameIndex + 1;

    for (let fi = startIdx; fi < endIdx; fi++) {
      const frame = layer.getFrameAt(fi);
      if (frame) {
        const transformed = flipVertical(frame);
        applyTransformToFrame(frame, transformed);
        framesProcessed++;
      }
    }

    return { success: true, transform: 'flip_vertical', framesProcessed };
  }

  private rotateTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number,
    angle: number,
    allFrames: boolean = false
  ): object {
    const piskel = this.getProject(projectId);
    const layer = piskel.getLayerAt(layerIndex);
    if (!layer) throw new Error(`Layer ${layerIndex} not found`);

    let framesProcessed = 0;
    const startIdx = allFrames ? 0 : frameIndex;
    const endIdx = allFrames ? layer.size() : frameIndex + 1;
    const isSquare = piskel.getWidth() === piskel.getHeight();

    for (let fi = startIdx; fi < endIdx; fi++) {
      const frame = layer.getFrameAt(fi);
      if (!frame) continue;

      let transformed: Frame;
      switch (angle) {
        case 90:
          transformed = rotate90CW(frame);
          break;
        case 180:
          transformed = rotate180(frame);
          break;
        case 270:
          transformed = rotate90CCW(frame);
          break;
        default:
          throw new Error(`Invalid rotation angle: ${angle}. Must be 90, 180, or 270.`);
      }

      if (isSquare || angle === 180) {
        applyTransformToFrame(frame, transformed);
      } else {
        // Non-square 90/270 rotation: replace frame in layer
        applyTransformToLayer(layer, fi, transformed);
      }
      framesProcessed++;
    }

    return { success: true, transform: 'rotate', angle, framesProcessed };
  }

  private shiftFrameTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number,
    dx: number,
    dy: number,
    wrap: boolean,
    allFrames: boolean = false
  ): object {
    const piskel = this.getProject(projectId);
    const layer = piskel.getLayerAt(layerIndex);
    if (!layer) throw new Error(`Layer ${layerIndex} not found`);

    let framesProcessed = 0;
    const startIdx = allFrames ? 0 : frameIndex;
    const endIdx = allFrames ? layer.size() : frameIndex + 1;

    for (let fi = startIdx; fi < endIdx; fi++) {
      const frame = layer.getFrameAt(fi);
      if (frame) {
        const transformed = shiftFrame(frame, dx, dy, wrap);
        applyTransformToFrame(frame, transformed);
        framesProcessed++;
      }
    }

    return { success: true, transform: 'shift', dx, dy, wrap, framesProcessed };
  }

  // Frame reordering implementations
  private moveFrameTool(
    projectId: string,
    fromIndex: number,
    toIndex: number
  ): object {
    const piskel = this.getProject(projectId);

    if (fromIndex < 0 || fromIndex >= piskel.getFrameCount()) {
      throw new Error(`Source frame index ${fromIndex} out of range`);
    }
    if (toIndex < 0 || toIndex >= piskel.getFrameCount()) {
      throw new Error(`Target frame index ${toIndex} out of range`);
    }

    for (let i = 0; i < piskel.getLayerCount(); i++) {
      const layer = piskel.getLayerAt(i);
      if (layer) {
        layer.moveFrame(fromIndex, toIndex);
      }
    }

    return { success: true, fromIndex, toIndex };
  }

  private swapFramesTool(
    projectId: string,
    frameIndexA: number,
    frameIndexB: number
  ): object {
    const piskel = this.getProject(projectId);

    if (frameIndexA < 0 || frameIndexA >= piskel.getFrameCount()) {
      throw new Error(`Frame index ${frameIndexA} out of range`);
    }
    if (frameIndexB < 0 || frameIndexB >= piskel.getFrameCount()) {
      throw new Error(`Frame index ${frameIndexB} out of range`);
    }

    for (let i = 0; i < piskel.getLayerCount(); i++) {
      const layer = piskel.getLayerAt(i);
      if (layer) {
        layer.swapFramesAt(frameIndexA, frameIndexB);
      }
    }

    return { success: true, frameIndexA, frameIndexB };
  }

  // Layer enhancement implementations
  private renameLayerTool(
    projectId: string,
    layerIndex: number,
    name: string
  ): object {
    const piskel = this.getProject(projectId);
    const layer = piskel.getLayerAt(layerIndex);
    if (!layer) {
      throw new Error(`Layer ${layerIndex} not found`);
    }
    const oldName = layer.getName();
    layer.setName(name);
    return { success: true, layerIndex, oldName, newName: name };
  }

  private setLayerOpacityTool(
    projectId: string,
    layerIndex: number,
    opacity: number
  ): object {
    const piskel = this.getProject(projectId);
    const layer = piskel.getLayerAt(layerIndex);
    if (!layer) {
      throw new Error(`Layer ${layerIndex} not found`);
    }
    layer.setOpacity(opacity);
    return { success: true, layerIndex, opacity: layer.getOpacity() };
  }

  private setLayerVisibilityTool(
    projectId: string,
    layerIndex: number,
    visible: boolean
  ): object {
    const piskel = this.getProject(projectId);
    const layer = piskel.getLayerAt(layerIndex);
    if (!layer) {
      throw new Error(`Layer ${layerIndex} not found`);
    }
    layer.setVisible(visible);
    return { success: true, layerIndex, visible };
  }

  private mergeLayersTool(
    projectId: string,
    sourceLayerIndex: number,
    targetLayerIndex: number
  ): object {
    const piskel = this.getProject(projectId);

    const sourceLayer = piskel.getLayerAt(sourceLayerIndex);
    if (!sourceLayer) {
      throw new Error(`Source layer ${sourceLayerIndex} not found`);
    }

    const targetLayer = piskel.getLayerAt(targetLayerIndex);
    if (!targetLayer) {
      throw new Error(`Target layer ${targetLayerIndex} not found`);
    }

    const frameCount = piskel.getFrameCount();
    for (let i = 0; i < frameCount; i++) {
      const srcFrame = sourceLayer.getFrameAt(i);
      const tgtFrame = targetLayer.getFrameAt(i);
      if (srcFrame && tgtFrame) {
        const srcPixels = srcFrame.getPixels();
        const width = piskel.getWidth();
        const height = piskel.getHeight();
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcColor = srcPixels[y * width + x];
            if (srcColor !== 0) {
              tgtFrame.setPixel(x, y, srcColor);
            }
          }
        }
      }
    }

    piskel.removeLayer(sourceLayer);

    return {
      success: true,
      mergedFrames: frameCount,
      removedLayerIndex: sourceLayerIndex,
      targetLayerIndex,
    };
  }

  // Palette tool implementations
  private createPaletteTool(
    paletteId: string,
    name?: string,
    colors?: string[],
    preset?: string
  ): object {
    if (preset) {
      const presetPalette = getPresetPalette(preset);
      if (!presetPalette) {
        throw new Error(
          `Unknown preset palette: "${preset}". Available: ${listPresetPalettes().map(p => p.key).join(', ')}`
        );
      }
      this.palettes.set(paletteId, presetPalette);
      return {
        success: true,
        paletteId,
        name: presetPalette.getName(),
        colorCount: presetPalette.getColorCount(),
        colors: presetPalette.getColors(),
      };
    }

    const palette = new Palette(name ?? paletteId, colors ?? []);
    this.palettes.set(paletteId, palette);

    return {
      success: true,
      paletteId,
      name: palette.getName(),
      colorCount: palette.getColorCount(),
      colors: palette.getColors(),
    };
  }

  private getPaletteTool(paletteId: string): object {
    const palette = this.palettes.get(paletteId);
    if (!palette) {
      throw new Error(`Palette "${paletteId}" not found`);
    }
    return {
      paletteId,
      name: palette.getName(),
      colorCount: palette.getColorCount(),
      colors: palette.getColors(),
    };
  }

  private listPalettesTool(): object {
    const custom = [];
    for (const [id, palette] of this.palettes) {
      custom.push({
        paletteId: id,
        name: palette.getName(),
        colorCount: palette.getColorCount(),
      });
    }

    const presets = listPresetPalettes();

    return { customPalettes: custom, availablePresets: presets };
  }

  private addPaletteColorTool(paletteId: string, color: string): object {
    const palette = this.palettes.get(paletteId);
    if (!palette) {
      throw new Error(`Palette "${paletteId}" not found`);
    }
    palette.addColor(color);
    return {
      success: true,
      paletteId,
      colorCount: palette.getColorCount(),
      colors: palette.getColors(),
    };
  }

  private removePaletteColorTool(paletteId: string, color: string): object {
    const palette = this.palettes.get(paletteId);
    if (!palette) {
      throw new Error(`Palette "${paletteId}" not found`);
    }
    palette.removeColor(color);
    return {
      success: true,
      paletteId,
      colorCount: palette.getColorCount(),
      colors: palette.getColors(),
    };
  }

  // Canvas tool implementations
  private resizeCanvasTool(
    projectId: string,
    newWidth: number,
    newHeight: number,
    anchor: string = 'center'
  ): object {
    const piskel = this.getProject(projectId);
    const oldWidth = piskel.getWidth();
    const oldHeight = piskel.getHeight();

    if (newWidth <= 0 || newHeight <= 0) {
      throw new Error(`Invalid canvas dimensions: ${newWidth}x${newHeight}`);
    }

    // Calculate offset based on anchor
    let offsetX = 0;
    let offsetY = 0;

    switch (anchor) {
      case 'top-left':
        offsetX = 0; offsetY = 0;
        break;
      case 'top-center':
        offsetX = Math.floor((newWidth - oldWidth) / 2); offsetY = 0;
        break;
      case 'top-right':
        offsetX = newWidth - oldWidth; offsetY = 0;
        break;
      case 'middle-left':
        offsetX = 0; offsetY = Math.floor((newHeight - oldHeight) / 2);
        break;
      case 'center':
        offsetX = Math.floor((newWidth - oldWidth) / 2);
        offsetY = Math.floor((newHeight - oldHeight) / 2);
        break;
      case 'middle-right':
        offsetX = newWidth - oldWidth;
        offsetY = Math.floor((newHeight - oldHeight) / 2);
        break;
      case 'bottom-left':
        offsetX = 0; offsetY = newHeight - oldHeight;
        break;
      case 'bottom-center':
        offsetX = Math.floor((newWidth - oldWidth) / 2);
        offsetY = newHeight - oldHeight;
        break;
      case 'bottom-right':
        offsetX = newWidth - oldWidth;
        offsetY = newHeight - oldHeight;
        break;
      default:
        throw new Error(`Invalid anchor: ${anchor}`);
    }

    // Resize all frames in all layers
    for (let li = 0; li < piskel.getLayerCount(); li++) {
      const layer = piskel.getLayerAt(li);
      if (!layer) continue;

      for (let fi = 0; fi < layer.size(); fi++) {
        const oldFrame = layer.getFrameAt(fi);
        if (!oldFrame) continue;

        const newFrame = new Frame(newWidth, newHeight);
        const oldPixels = oldFrame.getPixels();

        for (let y = 0; y < oldHeight; y++) {
          for (let x = 0; x < oldWidth; x++) {
            const color = oldPixels[y * oldWidth + x];
            if (color !== 0) {
              const nx = x + offsetX;
              const ny = y + offsetY;
              if (nx >= 0 && nx < newWidth && ny >= 0 && ny < newHeight) {
                newFrame.setPixel(nx, ny, color);
              }
            }
          }
        }

        // Replace frame in layer
        layer.removeFrameAt(fi);
        layer.addFrameAt(newFrame, fi);
      }
    }

    // Update piskel dimensions (need to recreate since width/height are readonly)
    const descriptor = piskel.getDescriptor();
    const fps = piskel.getFPS();
    const newPiskel = new Piskel(newWidth, newHeight, fps, descriptor);

    for (let li = 0; li < piskel.getLayerCount(); li++) {
      const layer = piskel.getLayerAt(li);
      if (layer) {
        newPiskel.addLayer(layer);
      }
    }

    this.projects.set(projectId, newPiskel);

    return {
      success: true,
      oldWidth,
      oldHeight,
      newWidth,
      newHeight,
      anchor,
    };
  }

  private copyRegionTool(
    projectId: string,
    srcLayerIndex: number,
    srcFrameIndex: number,
    srcX: number | undefined,
    srcY: number | undefined,
    srcWidth: number | undefined,
    srcHeight: number | undefined,
    dstLayerIndex: number | undefined,
    dstFrameIndex: number,
    dstX: number,
    dstY: number
  ): object {
    const piskel = this.getProject(projectId);
    const sx = srcX ?? 0;
    const sy = srcY ?? 0;
    const sw = srcWidth ?? piskel.getWidth();
    const sh = srcHeight ?? piskel.getHeight();
    const dstLi = dstLayerIndex ?? srcLayerIndex;

    const srcFrame = this.getFrame(projectId, srcLayerIndex, srcFrameIndex);
    const dstFrame = this.getFrame(projectId, dstLi, dstFrameIndex);

    let pixelsCopied = 0;

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const color = srcFrame.getPixel(sx + x, sy + y);
        if (color !== null && color !== 0) {
          const nx = dstX + x;
          const ny = dstY + y;
          if (dstFrame.containsPixel(nx, ny)) {
            dstFrame.setPixel(nx, ny, color);
            pixelsCopied++;
          }
        }
      }
    }

    return {
      success: true,
      pixelsCopied,
      src: { layerIndex: srcLayerIndex, frameIndex: srcFrameIndex, x: sx, y: sy, width: sw, height: sh },
      dst: { layerIndex: dstLi, frameIndex: dstFrameIndex, x: dstX, y: dstY },
    };
  }

  // Analytics tool implementations
  private getUsedColorsTool(
    projectId: string,
    layerIndex: number,
    frameIndex: number
  ): object {
    const frame = this.getFrame(projectId, layerIndex, frameIndex);
    const pixels = frame.getPixels();
    const colorCounts = new Map<number, number>();

    for (let i = 0; i < pixels.length; i++) {
      const color = pixels[i];
      colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
    }

    const totalPixels = pixels.length;
    const colors: Array<{ color: string; count: number; percentage: number }> = [];
    let transparentCount = 0;

    for (const [colorInt, count] of colorCounts) {
      if (colorInt === 0) {
        transparentCount = count;
      } else {
        colors.push({
          color: intToHex(colorInt),
          count,
          percentage: Math.round(count / totalPixels * 10000) / 100,
        });
      }
    }

    // Sort by count descending
    colors.sort((a, b) => b.count - a.count);

    return {
      totalPixels,
      uniqueColors: colors.length,
      transparentPixels: transparentCount,
      colors,
    };
  }

  // Animation settings implementations
  private setFpsTool(
    projectId: string,
    fps: number
  ): object {
    if (fps < 1 || fps > 60) {
      throw new Error(`FPS must be between 1 and 60, got: ${fps}`);
    }

    const piskel = this.getProject(projectId);
    const oldFps = piskel.getFPS();
    piskel.setFPS(fps);

    return {
      success: true,
      oldFps,
      newFps: fps,
    };
  }

  /**
   * Start the server.
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Piskel MCP Server running on stdio');
  }
}
