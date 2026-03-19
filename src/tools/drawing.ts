/**
 * Drawing tools for pixel art operations.
 *
 * This file is part of Piskel MCP Server.
 * Licensed under Apache License 2.0
 */

import { Frame } from '../core/Frame.js';
import { colorToInt } from '../core/color.js';
import {
  getLinePixels,
  getUniformLinePixels,
  resizePixel,
  getCirclePixels,
  getFilledCirclePixels,
  getRectangleStrokePixels,
  getFilledRectanglePixels,
  floodFill,
} from '../algorithms/index.js';

/**
 * Draw a single pixel on the frame.
 */
export function drawPixel(
  frame: Frame,
  x: number,
  y: number,
  color: number | string
): boolean {
  if (!frame.containsPixel(x, y)) {
    return false;
  }
  frame.setPixel(x, y, color);
  return true;
}

/**
 * Draw multiple pixels on the frame.
 */
export function drawPixels(
  frame: Frame,
  pixels: Array<{ x: number; y: number }>,
  color: number | string
): number {
  let count = 0;
  const colorInt = typeof color === 'string' ? colorToInt(color) : color;

  for (const { x, y } of pixels) {
    if (frame.containsPixel(x, y)) {
      frame.setPixel(x, y, colorInt);
      count++;
    }
  }

  return count;
}

/**
 * Draw a line from (x0, y0) to (x1, y1).
 */
export function drawLine(
  frame: Frame,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: number | string,
  penSize: number = 1,
  uniform: boolean = false
): number {
  const colorInt = typeof color === 'string' ? colorToInt(color) : color;
  const linePixels = uniform
    ? getUniformLinePixels(x0, x1, y0, y1)
    : getLinePixels(x0, x1, y0, y1);

  let count = 0;

  if (penSize === 1) {
    for (const pixel of linePixels) {
      if (frame.containsPixel(pixel.col, pixel.row)) {
        frame.setPixel(pixel.col, pixel.row, colorInt);
        count++;
      }
    }
  } else {
    // Draw with larger pen size
    const drawnSet = new Set<string>();

    for (const pixel of linePixels) {
      const resized = resizePixel(pixel.col, pixel.row, penSize);
      for (const [px, py] of resized) {
        const key = `${px},${py}`;
        if (!drawnSet.has(key) && frame.containsPixel(px, py)) {
          drawnSet.add(key);
          frame.setPixel(px, py, colorInt);
          count++;
        }
      }
    }
  }

  return count;
}

/**
 * Draw a rectangle (outline only).
 */
export function drawRectangle(
  frame: Frame,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: number | string,
  penSize: number = 1
): number {
  const colorInt = typeof color === 'string' ? colorToInt(color) : color;
  const pixels = getRectangleStrokePixels(x0, y0, x1, y1, penSize);

  let count = 0;
  for (const [x, y] of pixels) {
    if (frame.containsPixel(x, y)) {
      frame.setPixel(x, y, colorInt);
      count++;
    }
  }

  return count;
}

/**
 * Draw a filled rectangle.
 */
export function drawFilledRectangle(
  frame: Frame,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: number | string
): number {
  const colorInt = typeof color === 'string' ? colorToInt(color) : color;
  const pixels = getFilledRectanglePixels(x0, y0, x1, y1);

  let count = 0;
  for (const [x, y] of pixels) {
    if (frame.containsPixel(x, y)) {
      frame.setPixel(x, y, colorInt);
      count++;
    }
  }

  return count;
}

/**
 * Draw a circle/ellipse (outline only).
 */
export function drawCircle(
  frame: Frame,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: number | string,
  penSize: number = 1
): number {
  const colorInt = typeof color === 'string' ? colorToInt(color) : color;
  const pixels = getCirclePixels(x0, y0, x1, y1, penSize);

  let count = 0;
  const drawnSet = new Set<string>();

  for (const [x, y] of pixels) {
    const key = `${x},${y}`;
    if (!drawnSet.has(key) && frame.containsPixel(x, y)) {
      drawnSet.add(key);
      frame.setPixel(x, y, colorInt);
      count++;
    }
  }

  return count;
}

/**
 * Draw a filled circle/ellipse.
 */
export function drawFilledCircle(
  frame: Frame,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: number | string
): number {
  const colorInt = typeof color === 'string' ? colorToInt(color) : color;
  const pixels = getFilledCirclePixels(x0, y0, x1, y1);

  let count = 0;
  for (const [x, y] of pixels) {
    if (frame.containsPixel(x, y)) {
      frame.setPixel(x, y, colorInt);
      count++;
    }
  }

  return count;
}

/**
 * Fill connected area with a color (paint bucket).
 */
export function fillArea(
  frame: Frame,
  x: number,
  y: number,
  color: number | string
): number {
  const filled = floodFill(frame, x, y, color);
  return filled.length;
}

/**
 * Erase pixels (set to transparent).
 */
export function erasePixel(
  frame: Frame,
  x: number,
  y: number,
  penSize: number = 1
): number {
  let count = 0;

  if (penSize === 1) {
    if (frame.containsPixel(x, y)) {
      frame.setPixel(x, y, 0); // Transparent
      count = 1;
    }
  } else {
    const pixels = resizePixel(x, y, penSize);
    for (const [px, py] of pixels) {
      if (frame.containsPixel(px, py)) {
        frame.setPixel(px, py, 0);
        count++;
      }
    }
  }

  return count;
}
