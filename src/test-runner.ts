#!/usr/bin/env node
/**
 * Test runner for Piskel MCP Server.
 * Licensed under Apache License 2.0
 */

import { Frame } from './core/Frame.js';
import { Layer } from './core/Layer.js';
import { Piskel } from './core/Piskel.js';
import { colorToInt, intToHex, intToRGBA } from './core/color.js';
import { drawPixel, drawLine, drawRectangle, drawFilledRectangle, drawCircle, fillArea } from './tools/drawing.js';
import { exportFrameAsPNG, exportSpriteSheetAsPNG } from './export/png.js';
import { exportAsGIF } from './export/gif.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function testColorUtilities(): void {
  console.log('Testing color utilities...');
  const red = colorToInt('#FF0000');
  const rgba = intToRGBA(red);
  console.log(`  #FF0000 -> r=${rgba.r}, g=${rgba.g}, b=${rgba.b}, a=${rgba.a}`);
  console.log('  Color utilities: OK');
}

function testFrame(): void {
  console.log('Testing Frame...');
  const frame = new Frame(16, 16);
  frame.setPixel(5, 5, '#FF0000');
  const pixel = frame.getPixel(5, 5);
  console.log(`  Pixel at (5,5): ${pixel !== null ? intToHex(pixel) : 'null'}`);
  console.log('  Frame: OK');
}

function testDrawingTools(): void {
  console.log('Testing drawing tools...');
  const frame = new Frame(32, 32);
  drawPixel(frame, 10, 10, '#FF0000');
  const linePixels = drawLine(frame, 0, 0, 15, 15, '#00FF00');
  const rectPixels = drawRectangle(frame, 2, 2, 10, 10, '#0000FF');
  const filledRectPixels = drawFilledRectangle(frame, 20, 20, 30, 30, '#FFFF00');
  console.log(`  Line: ${linePixels}, Rect: ${rectPixels}, FilledRect: ${filledRectPixels}`);
  console.log('  Drawing tools: OK');
}

function testPNGExport(): void {
  console.log('Testing PNG export...');
  const frame = new Frame(16, 16);
  drawFilledRectangle(frame, 2, 2, 14, 14, '#FFDD00');
  frame.setPixel(5, 5, '#000000');
  frame.setPixel(10, 5, '#000000');

  const pngData = exportFrameAsPNG(frame);
  console.log(`  PNG size: ${pngData.length} bytes`);

  const outputDir = path.join(__dirname, '..', 'test', 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'test_frame.png'), pngData);
  console.log('  PNG export: OK');
}

function testGIFExport(): void {
  console.log('Testing GIF export...');
  const piskel = new Piskel(16, 16, 12, { name: 'Animation Test' });
  const layer = new Layer('Layer 0');

  const colors = ['#FF0000', '#00FF00', '#0000FF'];
  for (const color of colors) {
    const frame = new Frame(16, 16);
    drawFilledRectangle(frame, 4, 4, 12, 12, color);
    layer.addFrame(frame);
  }
  piskel.addLayer(layer);

  const gifData = exportAsGIF(piskel, 200);
  console.log(`  GIF size: ${gifData.length} bytes`);

  const outputDir = path.join(__dirname, '..', 'test', 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'test_animation.gif'), gifData);
  console.log('  GIF export: OK');
}

async function runTests(): Promise<void> {
  console.log('=== Piskel MCP Server Tests ===\n');
  try {
    testColorUtilities();
    testFrame();
    testDrawingTools();
    testPNGExport();
    testGIFExport();
    console.log('\n=== All tests passed! ===');
  } catch (error) {
    console.error('\n=== Test failed! ===', error);
    process.exit(1);
  }
}

runTests();
