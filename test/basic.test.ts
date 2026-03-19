/**
 * Basic tests for Piskel MCP Server.
 *
 * This file is part of Piskel MCP Server.
 * Licensed under Apache License 2.0
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Frame } from '../src/core/Frame.js';
import { Layer } from '../src/core/Layer.js';
import { Piskel } from '../src/core/Piskel.js';
import { colorToInt, intToColor, intToHex, intToRGBA } from '../src/core/color.js';
import {
  drawPixel,
  drawLine,
  drawRectangle,
  drawFilledRectangle,
  drawCircle,
  fillArea,
} from '../src/tools/drawing.js';
import {
  exportFrameAsPNG,
  exportSpriteSheetAsPNG,
} from '../src/export/png.js';
import {
  exportAsGIF,
} from '../src/export/gif.js';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'test', 'output');

beforeAll(() => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
});

describe('Color Utilities', () => {
  it('should parse hex color', () => {
    const red = colorToInt('#FF0000');
    expect(red).toBe(0xFF0000FF);
  });

  it('should parse rgba color', () => {
    // AABBGGRR format: alpha=255, b=255, g=0, r=0
    const blue = colorToInt('rgba(0, 0, 255, 1)');
    expect(blue).toBe(0xFFFF0000);
  });

  it('should convert int to hex', () => {
    const hex = intToHex(0xFF0000FF);
    expect(hex).toBe('#ff0000');
  });

  it('should convert int to RGBA', () => {
    const rgba = intToRGBA(0xFF0000FF);
    expect(rgba.r).toBe(255);
    expect(rgba.g).toBe(0);
    expect(rgba.b).toBe(0);
    expect(rgba.a).toBe(255);
  });
});

describe('Frame', () => {
  it('should create a frame', () => {
    const frame = new Frame(16, 16);
    expect(frame.width).toBe(16);
    expect(frame.height).toBe(16);
  });

  it('should set and get pixel', () => {
    const frame = new Frame(16, 16);
    frame.setPixel(5, 5, '#FF0000');
    const pixel = frame.getPixel(5, 5);
    expect(pixel).toBe(0xFF0000FF);
  });

  it('should clone frame', () => {
    const frame = new Frame(16, 16);
    frame.setPixel(5, 5, '#FF0000');
    const cloned = frame.clone();
    expect(cloned.getPixel(5, 5)).toBe(0xFF0000FF);
  });
});

describe('Layer', () => {
  it('should create a layer', () => {
    const layer = new Layer('Test Layer');
    expect(layer.getName()).toBe('Test Layer');
  });

  it('should add and count frames', () => {
    const layer = new Layer('Test Layer');
    layer.addFrame(new Frame(16, 16));
    layer.addFrame(new Frame(16, 16));
    expect(layer.size()).toBe(2);
  });

  it('should duplicate frame', () => {
    const layer = new Layer('Test Layer');
    layer.addFrame(new Frame(16, 16));
    layer.duplicateFrameAt(0);
    expect(layer.size()).toBe(2);
  });
});

describe('Piskel', () => {
  it('should create a project', () => {
    const piskel = new Piskel(32, 32, 12, { name: 'Test Project' });
    expect(piskel.getName()).toBe('Test Project');
    expect(piskel.getWidth()).toBe(32);
    expect(piskel.getHeight()).toBe(32);
  });

  it('should add layers', () => {
    const piskel = new Piskel(32, 32, 12, { name: 'Test' });
    const layer = new Layer('Layer 0');
    layer.addFrame(new Frame(32, 32));
    piskel.addLayer(layer);
    expect(piskel.getLayerCount()).toBe(1);
  });
});

describe('Drawing Tools', () => {
  it('should draw pixel', () => {
    const frame = new Frame(32, 32);
    const success = drawPixel(frame, 10, 10, '#FF0000');
    expect(success).toBe(true);
    expect(frame.getPixel(10, 10)).toBe(0xFF0000FF);
  });

  it('should draw line', () => {
    const frame = new Frame(32, 32);
    const count = drawLine(frame, 0, 0, 15, 15, '#00FF00');
    expect(count).toBeGreaterThan(0);
  });

  it('should draw rectangle', () => {
    const frame = new Frame(32, 32);
    const count = drawRectangle(frame, 2, 2, 10, 10, '#0000FF');
    expect(count).toBeGreaterThan(0);
  });

  it('should draw filled rectangle', () => {
    const frame = new Frame(32, 32);
    const count = drawFilledRectangle(frame, 20, 20, 30, 30, '#FFFF00');
    expect(count).toBeGreaterThan(0);
  });

  it('should draw circle', () => {
    const frame = new Frame(32, 32);
    const count = drawCircle(frame, 15, 15, 25, 25, '#FF00FF');
    expect(count).toBeGreaterThan(0);
  });

  it('should fill area', () => {
    const frame = new Frame(32, 32);
    const count = fillArea(frame, 25, 25, '#00FFFF');
    expect(count).toBeGreaterThan(0);
  });
});

describe('PNG Export', () => {
  it('should export frame as PNG', () => {
    const frame = new Frame(16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        frame.setPixel(x, y, '#FFDD00');
      }
    }
    const pngData = exportFrameAsPNG(frame);
    expect(pngData.length).toBeGreaterThan(0);

    const outputPath = path.join(OUTPUT_DIR, 'test_frame.png');
    fs.writeFileSync(outputPath, pngData);
    expect(fs.existsSync(outputPath)).toBe(true);
  });
});

describe('GIF Export', () => {
  it('should export as GIF', () => {
    const piskel = new Piskel(16, 16, 12, { name: 'Animation Test' });
    const layer = new Layer('Layer 0');

    const frame1 = new Frame(16, 16);
    drawFilledRectangle(frame1, 2, 6, 6, 10, '#FF0000');
    layer.addFrame(frame1);

    const frame2 = new Frame(16, 16);
    drawFilledRectangle(frame2, 6, 6, 10, 10, '#00FF00');
    layer.addFrame(frame2);

    const frame3 = new Frame(16, 16);
    drawFilledRectangle(frame3, 10, 6, 14, 10, '#0000FF');
    layer.addFrame(frame3);

    piskel.addLayer(layer);

    const gifData = exportAsGIF(piskel, 200);
    expect(gifData.length).toBeGreaterThan(0);

    const outputPath = path.join(OUTPUT_DIR, 'test_animation.gif');
    fs.writeFileSync(outputPath, gifData);
    expect(fs.existsSync(outputPath)).toBe(true);
  });
});

describe('Sprite Sheet Export', () => {
  it('should export sprite sheet', () => {
    const piskel = new Piskel(8, 8, 12, { name: 'Sprite Sheet Test' });
    const layer = new Layer('Layer 0');

    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'];
    for (const color of colors) {
      const frame = new Frame(8, 8);
      drawFilledRectangle(frame, 1, 1, 6, 6, color);
      layer.addFrame(frame);
    }

    piskel.addLayer(layer);

    const pngData = exportSpriteSheetAsPNG(piskel, 2);
    expect(pngData.length).toBeGreaterThan(0);

    const outputPath = path.join(OUTPUT_DIR, 'test_spritesheet.png');
    fs.writeFileSync(outputPath, pngData);
    expect(fs.existsSync(outputPath)).toBe(true);
  });
});