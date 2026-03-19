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
import { intToHex } from '../core/color.js';
import {
  drawPixel,
  drawPixels,
  drawLine,
  drawRectangle,
  drawFilledRectangle,
  drawCircle,
  drawFilledCircle,
  fillArea,
  erasePixel,
} from '../tools/drawing.js';
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
        description: 'Draw multiple pixels at once',
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
                },
                required: ['x', 'y'],
              },
              description: 'Array of pixel coordinates',
            },
            color: {
              type: 'string',
              description: 'Color in hex format',
            },
          },
          required: ['projectId', 'pixels', 'color'],
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
        description: 'Draw a circle/ellipse (outline or filled)',
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
              description: 'Bounding box top-left X',
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
          required: ['projectId', 'x0', 'y0', 'x1', 'y1', 'color'],
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
          args.pixels as Array<{ x: number; y: number }>,
          args.color as string
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
          args.x0 as number,
          args.y0 as number,
          args.x1 as number,
          args.y1 as number,
          args.color as string,
          (args.filled as boolean) ?? false,
          (args.penSize as number) ?? 1
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
          args.outputPath as string
        );

      case 'export_sprite_sheet':
        return this.exportSpriteSheet(
          args.projectId as string,
          args.outputPath as string,
          args.columns as number | undefined
        );

      case 'export_gif':
        return this.exportGIF(
          args.projectId as string,
          args.outputPath as string,
          (args.frameDelay as number) ?? 100
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
      layerCount: piskel.getLayerCount(),
      frameCount: piskel.getFrameCount(),
      layers: Array.from({ length: piskel.getLayerCount() }, (_, i) => {
        const layer = piskel.getLayerAt(i);
        return {
          index: i,
          name: layer?.getName() ?? `Layer ${i}`,
          frameCount: layer?.size() ?? 0,
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
    pixels: Array<{ x: number; y: number }>,
    color: string
  ): object {
    const frame = this.getFrame(projectId, layerIndex, frameIndex);
    const count = drawPixels(frame, pixels, color);
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
      ? drawFilledCircle(frame, x0, y0, x1, y1, color)
      : drawCircle(frame, x0, y0, x1, y1, color, penSize);
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
    const width = piskel.getWidth();
    const height = piskel.getHeight();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        frame.setPixel(x, y, 0);
      }
    }

    return { success: true, pixelsCleared: width * height };
  }

  // Export implementations
  private exportPNG(
    projectId: string,
    frameIndex: number,
    outputPath: string
  ): object {
    const piskel = this.getProject(projectId);
    const pngData = exportMergedFrameAsPNG(piskel, frameIndex);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, pngData);

    return {
      success: true,
      outputPath,
      size: pngData.length,
    };
  }

  private exportSpriteSheet(
    projectId: string,
    outputPath: string,
    columns?: number
  ): object {
    const piskel = this.getProject(projectId);
    const pngData = exportSpriteSheetAsPNG(piskel, columns);

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
    };
  }

  private exportGIF(
    projectId: string,
    outputPath: string,
    frameDelay: number
  ): object {
    const piskel = this.getProject(projectId);
    const gifData = exportAsGIF(piskel, frameDelay);

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

  /**
   * Start the server.
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Piskel MCP Server running on stdio');
  }
}
