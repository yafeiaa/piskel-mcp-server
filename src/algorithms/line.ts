/**
 * Line drawing algorithms.
 *
 * This file is derived from Piskel (https://github.com/piskelapp/piskel)
 * Original work Copyright 2017 Julian Descottes
 * Licensed under Apache License 2.0
 *
 * Modifications:
 * - Converted from JavaScript to TypeScript
 * - Added type definitions
 */

export interface Pixel {
  col: number;
  row: number;
}

/**
 * Bresenham line algorithm: Get an array of pixels from start to end coordinates.
 *
 * http://en.wikipedia.org/wiki/Bresenham's_line_algorithm
 *
 * Derived from pskl.PixelUtils.getLinePixels in Piskel.
 */
export function getLinePixels(x0: number, x1: number, y0: number, y1: number): Pixel[] {
  const pixels: Pixel[] = [];

  x1 = x1 ?? 0;
  y1 = y1 ?? 0;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);

  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;

  let err = dx - dy;
  let currentX = x0;
  let currentY = y0;

  while (true) {
    pixels.push({ col: currentX, row: currentY });

    if (currentX === x1 && currentY === y1) {
      break;
    }

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currentX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currentY += sy;
    }
  }

  return pixels;
}

/**
 * Create a uniform line using the same number of pixels at each step.
 * Better for pixel art where consistent step sizes are desired.
 *
 * Derived from pskl.PixelUtils.getUniformLinePixels in Piskel.
 */
export function getUniformLinePixels(x0: number, x1: number, y0: number, y1: number): Pixel[] {
  const pixels: Pixel[] = [];

  x1 = x1 ?? 0;
  y1 = y1 ?? 0;

  const dx = Math.abs(x1 - x0) + 1;
  const dy = Math.abs(y1 - y0) + 1;

  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;

  const ratio = Math.max(dx, dy) / Math.min(dx, dy);
  let pixelStep = Math.round(ratio) || 0;

  if (pixelStep > Math.min(dx, dy)) {
    pixelStep = Infinity;
  }

  const maxDistance = distance(x0, x1, y0, y1);

  let x = x0;
  let y = y0;
  let i = 0;

  while (true) {
    i++;
    pixels.push({ col: x, row: y });

    if (distance(x0, x, y0, y) >= maxDistance) {
      break;
    }

    const isAtStep = i % pixelStep === 0;
    if (dx >= dy || isAtStep) {
      x += sx;
    }
    if (dy >= dx || isAtStep) {
      y += sy;
    }
  }

  return pixels;
}

/**
 * Calculate distance between two points.
 */
export function distance(x0: number, x1: number, y0: number, y1: number): number {
  return Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
}

/**
 * Resize a pixel to a square of given size.
 *
 * Derived from pskl.PixelUtils.resizePixel in Piskel.
 */
export function resizePixel(col: number, row: number, size: number): Array<[number, number]> {
  const pixels: Array<[number, number]> = [];

  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      pixels.push([col - Math.floor(size / 2) + i, row - Math.floor(size / 2) + j]);
    }
  }

  return pixels;
}
