/**
 * Circle/Ellipse drawing algorithms.
 *
 * This file is derived from Piskel (https://github.com/piskelapp/piskel)
 * Original work Copyright 2017 Julian Descottes
 * Licensed under Apache License 2.0
 *
 * Modifications:
 * - Converted from JavaScript to TypeScript
 * - Extracted as standalone functions
 */

import { getOrderedRectangleCoordinates } from './rectangle.js';

/**
 * Get pixels for an ellipse/circle outline.
 * The ellipse is defined by a bounding rectangle.
 *
 * Derived from pskl.tools.drawing.Circle in Piskel.
 */
export function getCirclePixels(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  penSize: number = 1
): Array<[number, number]> {
  const coords = getOrderedRectangleCoordinates(x0, y0, x1, y1);
  const pixels: Array<[number, number]> = [];

  const xC = Math.round((coords.x0 + coords.x1) / 2);
  const yC = Math.round((coords.y0 + coords.y1) / 2);
  const evenX = (coords.x0 + coords.x1) % 2;
  const evenY = (coords.y0 + coords.y1) % 2;
  const rX = coords.x1 - xC;
  const rY = coords.y1 - yC;

  if (rX === 0 || rY === 0) {
    // Degenerate case: line
    for (let x = coords.x0; x <= coords.x1; x++) {
      for (let y = coords.y0; y <= coords.y1; y++) {
        pixels.push([x, y]);
      }
    }
    return pixels;
  }

  if (penSize === 1) {
    // Thin outline
    for (let x = coords.x0; x <= xC; x++) {
      const angle = Math.acos((x - xC) / rX);
      const y = Math.round(rY * Math.sin(angle) + yC);
      pixels.push([x - evenX, y]);
      pixels.push([x - evenX, 2 * yC - y - evenY]);
      pixels.push([2 * xC - x, y]);
      pixels.push([2 * xC - x, 2 * yC - y - evenY]);
    }

    for (let y = coords.y0; y <= yC; y++) {
      const angle = Math.asin((y - yC) / rY);
      const x = Math.round(rX * Math.cos(angle) + xC);
      pixels.push([x, y - evenY]);
      pixels.push([2 * xC - x - evenX, y - evenY]);
      pixels.push([x, 2 * yC - y]);
      pixels.push([2 * xC - x - evenX, 2 * yC - y]);
    }

    return pixels;
  }

  // Thick outline
  let iX = rX - penSize;
  let iY = rY - penSize;
  if (iX < 0) {
    iX = 0;
  }
  if (iY < 0) {
    iY = 0;
  }

  for (let x = 0; x <= rX; x++) {
    for (let y = 0; y <= rY; y++) {
      const angle = Math.atan(y / x);
      const r = Math.sqrt(x * x + y * y);

      const innerBound =
        rX <= penSize || rY <= penSize
          ? 0
          : (iX * iY) /
              Math.sqrt(
                iY * iY * Math.pow(Math.cos(angle), 2) + iX * iX * Math.pow(Math.sin(angle), 2)
              ) +
            0.5;

      const outerBound =
        (rX * rY) /
          Math.sqrt(
            rY * rY * Math.pow(Math.cos(angle), 2) + rX * rX * Math.pow(Math.sin(angle), 2)
          ) +
        0.5;

      if (r > innerBound && r < outerBound) {
        pixels.push([xC + x, yC + y]);
        pixels.push([xC - x - evenX, yC + y]);
        pixels.push([xC + x, yC - y - evenY]);
        pixels.push([xC - x - evenX, yC - y - evenY]);
      }
    }
  }

  return pixels;
}

/**
 * Get pixels for a filled ellipse/circle.
 */
export function getFilledCirclePixels(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): Array<[number, number]> {
  const coords = getOrderedRectangleCoordinates(x0, y0, x1, y1);
  const pixels: Array<[number, number]> = [];

  const xC = (coords.x0 + coords.x1) / 2;
  const yC = (coords.y0 + coords.y1) / 2;
  const rX = (coords.x1 - coords.x0) / 2;
  const rY = (coords.y1 - coords.y0) / 2;

  if (rX === 0 || rY === 0) {
    // Degenerate case
    for (let x = coords.x0; x <= coords.x1; x++) {
      for (let y = coords.y0; y <= coords.y1; y++) {
        pixels.push([x, y]);
      }
    }
    return pixels;
  }

  for (let x = coords.x0; x <= coords.x1; x++) {
    for (let y = coords.y0; y <= coords.y1; y++) {
      // Check if point is inside ellipse: (x-h)²/a² + (y-k)²/b² <= 1
      const dx = (x - xC) / rX;
      const dy = (y - yC) / rY;
      if (dx * dx + dy * dy <= 1) {
        pixels.push([x, y]);
      }
    }
  }

  return pixels;
}
