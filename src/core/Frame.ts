/**
 * Frame model for pixel art.
 *
 * This file is derived from Piskel (https://github.com/piskelapp/piskel)
 * Original work Copyright 2017 Julian Descottes
 * Licensed under Apache License 2.0
 *
 * Modifications:
 * - Converted from JavaScript to TypeScript
 * - Removed browser DOM dependencies
 * - Added type definitions
 */

import { colorToInt, TRANSPARENT_COLOR_INT } from './color.js';

let frameIdCounter = 0;

/**
 * Frame represents a single frame in the animation.
 * Uses Uint32Array for pixel storage (AABBGGRR format).
 */
export class Frame {
  readonly width: number;
  readonly height: number;
  readonly id: number;

  private version: number;
  private pixels: Uint32Array;

  constructor(width: number, height: number) {
    if (!width || !height || width <= 0 || height <= 0) {
      throw new Error(`Invalid Frame dimensions: ${width}x${height}`);
    }

    this.width = width;
    this.height = height;
    this.id = frameIdCounter++;
    this.version = 0;
    this.pixels = Frame.createEmptyPixelGrid(width, height);
  }

  /**
   * Create an empty pixel grid filled with transparent color.
   */
  static createEmptyPixelGrid(width: number, height: number): Uint32Array {
    const pixels = new Uint32Array(width * height);
    pixels.fill(TRANSPARENT_COLOR_INT);
    return pixels;
  }

  /**
   * Create a Frame from a 2D pixel array or flat Uint32Array.
   */
  static fromPixelGrid(
    pixels: number[][] | Uint32Array | number[],
    width?: number,
    height?: number
  ): Frame {
    if (!pixels || (Array.isArray(pixels) && pixels.length === 0)) {
      throw new Error('Invalid pixel data in Frame.fromPixelGrid');
    }

    let w: number;
    let h: number;
    let buffer: Uint32Array;

    if (Array.isArray(pixels) && Array.isArray(pixels[0])) {
      // 2D array [x][y]
      const grid = pixels as (number | string)[][];
      w = grid.length;
      h = grid[0].length;
      buffer = new Uint32Array(w * h);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const pixel = grid[x][y];
          buffer[y * w + x] = typeof pixel === 'string' ? colorToInt(pixel) : pixel;
        }
      }
    } else if (width && height) {
      // Flat array with dimensions
      w = width;
      h = height;
      buffer = new Uint32Array(pixels as ArrayLike<number>);
    } else {
      throw new Error('Missing width and height for flat pixel array');
    }

    const frame = new Frame(w, h);
    frame.setPixels(buffer);
    return frame;
  }

  /**
   * Create an empty frame with the same dimensions as another frame.
   */
  static createEmptyFromFrame(frame: Frame): Frame {
    return new Frame(frame.getWidth(), frame.getHeight());
  }

  /**
   * Clone this frame.
   */
  clone(): Frame {
    const cloned = new Frame(this.width, this.height);
    cloned.setPixels(this.pixels);
    return cloned;
  }

  /**
   * Get a copy of the pixel data.
   */
  getPixels(): Uint32Array {
    return new Uint32Array(this.pixels);
  }

  /**
   * Get direct reference to pixels (use with caution).
   */
  getPixelsRef(): Uint32Array {
    return this.pixels;
  }

  /**
   * Set pixels from another array.
   */
  setPixels(pixels: Uint32Array): void {
    this.pixels = new Uint32Array(pixels);
    this.version++;
  }

  /**
   * Clear the frame (fill with transparent).
   */
  clear(): void {
    this.pixels = Frame.createEmptyPixelGrid(this.width, this.height);
    this.version++;
  }

  /**
   * Get the frame hash for change detection.
   */
  getHash(): string {
    return `${this.id}-${this.version}`;
  }

  /**
   * Set a pixel at the given coordinates.
   */
  setPixel(x: number, y: number, color: number | string): void {
    if (!this.containsPixel(x, y)) {
      return;
    }

    const index = y * this.width + x;
    const currentColor = this.pixels[index];
    const newColor = typeof color === 'string' ? colorToInt(color) : color;

    if (currentColor !== newColor) {
      this.pixels[index] = newColor || TRANSPARENT_COLOR_INT;
      this.version++;
    }
  }

  /**
   * Get the pixel color at the given coordinates.
   */
  getPixel(x: number, y: number): number | null {
    if (!this.containsPixel(x, y)) {
      return null;
    }
    return this.pixels[y * this.width + x];
  }

  /**
   * Iterate over all pixels.
   */
  forEachPixel(callback: (color: number, x: number, y: number, frame: Frame) => void): void {
    const length = this.width * this.height;
    for (let i = 0; i < length; i++) {
      callback(this.pixels[i], i % this.width, Math.floor(i / this.width), this);
    }
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  /**
   * Check if coordinates are within bounds.
   */
  containsPixel(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /**
   * Check if this frame has the same size as another.
   */
  isSameSize(other: Frame): boolean {
    return this.width === other.width && this.height === other.height;
  }

  /**
   * Convert frame to a 2D array [y][x] for JSON serialization.
   */
  toArray(): number[][] {
    const result: number[][] = [];
    for (let y = 0; y < this.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push(this.pixels[y * this.width + x]);
      }
      result.push(row);
    }
    return result;
  }
}
