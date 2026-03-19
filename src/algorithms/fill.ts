/**
 * Flood fill algorithm.
 *
 * This file is derived from Piskel (https://github.com/piskelapp/piskel)
 * Original work Copyright 2017 Julian Descottes
 * Licensed under Apache License 2.0
 *
 * Modifications:
 * - Converted from JavaScript to TypeScript
 * - Extracted as standalone functions
 */

import { Frame } from '../core/Frame.js';
import { colorToInt } from '../core/color.js';
import type { Pixel } from './line.js';

/**
 * Visit connected pixels using a visitor function.
 * Uses flood-fill algorithm to traverse connected regions.
 *
 * Derived from pskl.PixelUtils.visitConnectedPixels in Piskel.
 */
export function visitConnectedPixels(
  startPixel: Pixel,
  frame: Frame,
  pixelVisitor: (pixel: Pixel) => boolean
): Pixel[] {
  const queue: Pixel[] = [];
  const visitedPixels: Pixel[] = [];
  const dy = [-1, 0, 1, 0];
  const dx = [0, 1, 0, -1];

  queue.push(startPixel);
  visitedPixels.push(startPixel);
  pixelVisitor(startPixel);

  let loopCount = 0;
  const cellCount = frame.getWidth() * frame.getHeight();

  while (queue.length > 0) {
    loopCount++;

    const currentItem = queue.pop()!;

    for (let i = 0; i < 4; i++) {
      const nextCol = currentItem.col + dx[i];
      const nextRow = currentItem.row + dy[i];

      if (frame.containsPixel(nextCol, nextRow)) {
        const connectedPixel = { col: nextCol, row: nextRow };
        const isValid = pixelVisitor(connectedPixel);
        if (isValid) {
          queue.push(connectedPixel);
          visitedPixels.push(connectedPixel);
        }
      }
    }

    // Safety: prevent infinite loops
    if (loopCount > 10 * cellCount) {
      console.warn('Flood fill loop breaker triggered');
      break;
    }
  }

  return visitedPixels;
}

/**
 * Get all pixels connected to the starting point that have the same color.
 *
 * Derived from pskl.PixelUtils.getSimilarConnectedPixelsFromFrame in Piskel.
 */
export function getSimilarConnectedPixels(frame: Frame, col: number, row: number): Pixel[] {
  const targetColor = frame.getPixel(col, row);
  if (targetColor === null) {
    return [];
  }

  const visited = new Set<string>();

  return visitConnectedPixels({ col, row }, frame, (pixel) => {
    const key = `${pixel.col}-${pixel.row}`;
    if (visited.has(key)) {
      return false;
    }
    visited.add(key);
    return frame.getPixel(pixel.col, pixel.row) === targetColor;
  });
}

/**
 * Paint bucket tool: fill connected pixels with a new color.
 *
 * Derived from pskl.PixelUtils.paintSimilarConnectedPixelsFromFrame in Piskel.
 */
export function floodFill(
  frame: Frame,
  col: number,
  row: number,
  replacementColor: number | string
): Pixel[] {
  const colorInt = typeof replacementColor === 'string' 
    ? colorToInt(replacementColor) 
    : replacementColor;

  const targetColor = frame.getPixel(col, row);

  // Can't fill if out of bounds or same color
  if (targetColor === null || targetColor === colorInt) {
    return [];
  }

  const painted = visitConnectedPixels({ col, row }, frame, (pixel) => {
    if (frame.getPixel(pixel.col, pixel.row) === targetColor) {
      frame.setPixel(pixel.col, pixel.row, colorInt);
      return true;
    }
    return false;
  });

  return painted;
}

/**
 * Fill all pixels of a specific color with a new color (global replace).
 */
export function replaceColor(
  frame: Frame,
  oldColor: number | string,
  newColor: number | string
): number {
  const oldColorInt = typeof oldColor === 'string' ? colorToInt(oldColor) : oldColor;
  const newColorInt = typeof newColor === 'string' ? colorToInt(newColor) : newColor;

  let count = 0;
  frame.forEachPixel((color, x, y) => {
    if (color === oldColorInt) {
      frame.setPixel(x, y, newColorInt);
      count++;
    }
  });

  return count;
}
