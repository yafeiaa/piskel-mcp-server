/**
 * Rectangle drawing algorithms.
 *
 * This file is derived from Piskel (https://github.com/piskelapp/piskel)
 * Original work Copyright 2017 Julian Descottes
 * Licensed under Apache License 2.0
 *
 * Modifications:
 * - Converted from JavaScript to TypeScript
 * - Extracted as standalone functions
 */

import type { Pixel } from './line.js';

export interface OrderedRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Return ordered rectangle coordinates.
 * {x0, y0} => top left corner, {x1, y1} => bottom right corner
 *
 * Derived from pskl.PixelUtils.getOrderedRectangleCoordinates in Piskel.
 */
export function getOrderedRectangleCoordinates(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): OrderedRect {
  return {
    x0: Math.min(x0, x1),
    y0: Math.min(y0, y1),
    x1: Math.max(x0, x1),
    y1: Math.max(y0, y1),
  };
}

/**
 * Get all pixels inside a rectangle.
 *
 * Derived from pskl.PixelUtils.getRectanglePixels in Piskel.
 */
export function getRectanglePixels(x0: number, y0: number, x1: number, y1: number): Pixel[] {
  const rect = getOrderedRectangleCoordinates(x0, y0, x1, y1);
  const pixels: Pixel[] = [];

  for (let x = rect.x0; x <= rect.x1; x++) {
    for (let y = rect.y0; y <= rect.y1; y++) {
      pixels.push({ col: x, row: y });
    }
  }

  return pixels;
}

/**
 * Get pixels for a rectangle outline (stroke only).
 *
 * Derived from Rectangle tool in Piskel.
 */
export function getRectangleStrokePixels(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  penSize: number = 1
): Array<[number, number]> {
  const rect = getOrderedRectangleCoordinates(x0, y0, x1, y1);
  const pixels: Array<[number, number]> = [];

  for (let x = rect.x0; x <= rect.x1; x++) {
    for (let y = rect.y0; y <= rect.y1; y++) {
      // Only include border pixels based on pen size
      if (
        x > rect.x1 - penSize ||
        x < rect.x0 + penSize ||
        y > rect.y1 - penSize ||
        y < rect.y0 + penSize
      ) {
        pixels.push([x, y]);
      }
    }
  }

  return pixels;
}

/**
 * Get pixels for a filled rectangle.
 */
export function getFilledRectanglePixels(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): Array<[number, number]> {
  const rect = getOrderedRectangleCoordinates(x0, y0, x1, y1);
  const pixels: Array<[number, number]> = [];

  for (let x = rect.x0; x <= rect.x1; x++) {
    for (let y = rect.y0; y <= rect.y1; y++) {
      pixels.push([x, y]);
    }
  }

  return pixels;
}
