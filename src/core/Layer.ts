/**
 * Layer model for pixel art.
 *
 * This file is derived from Piskel (https://github.com/piskelapp/piskel)
 * Original work Copyright 2017 Julian Descottes
 * Licensed under Apache License 2.0
 *
 * Modifications:
 * - Converted from JavaScript to TypeScript
 * - Added type definitions
 */

import { Frame } from './Frame.js';

/**
 * Layer represents a collection of frames at the same z-index.
 */
export class Layer {
  private name: string;
  private frames: Frame[];
  private opacity: number;

  constructor(name: string) {
    if (!name) {
      throw new Error("Layer name is required");
    }
    this.name = name;
    this.frames = [];
    this.opacity = 1;
  }

  /**
   * Create a Layer from existing frames.
   */
  static fromFrames(name: string, frames: Frame[]): Layer {
    const layer = new Layer(name);
    frames.forEach(frame => layer.addFrame(frame));
    return layer;
  }

  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    this.name = name;
  }

  getOpacity(): number {
    return this.opacity;
  }

  setOpacity(opacity: number | string): void {
    let value = typeof opacity === 'string' ? parseFloat(opacity) : opacity;

    if (value === null || isNaN(value) || value < 0 || value > 1) {
      return;
    }

    this.opacity = +value.toFixed(3);
  }

  isTransparent(): boolean {
    return this.opacity < 1;
  }

  getFrames(): Frame[] {
    return this.frames;
  }

  getFrameAt(index: number): Frame | undefined {
    return this.frames[index];
  }

  addFrame(frame: Frame): void {
    this.frames.push(frame);
  }

  addFrameAt(frame: Frame, index: number): void {
    this.frames.splice(index, 0, frame);
  }

  removeFrame(frame: Frame): void {
    const index = this.frames.indexOf(frame);
    if (index !== -1) {
      this.removeFrameAt(index);
    }
  }

  removeFrameAt(index: number): void {
    if (this.frames[index]) {
      this.frames.splice(index, 1);
    } else {
      console.error(`Invalid index in removeFrameAt: ${index} (size: ${this.size()})`);
    }
  }

  moveFrame(fromIndex: number, toIndex: number): void {
    const frame = this.frames.splice(fromIndex, 1)[0];
    if (frame) {
      this.frames.splice(toIndex, 0, frame);
    }
  }

  swapFramesAt(fromIndex: number, toIndex: number): void {
    const fromFrame = this.frames[fromIndex];
    const toFrame = this.frames[toIndex];

    if (fromFrame && toFrame) {
      this.frames[toIndex] = fromFrame;
      this.frames[fromIndex] = toFrame;
    } else {
      console.error(`Frame not found in swapFramesAt (from ${fromIndex}, to ${toIndex})`);
    }
  }

  duplicateFrame(frame: Frame): void {
    const index = this.frames.indexOf(frame);
    if (index !== -1) {
      this.duplicateFrameAt(index);
    }
  }

  duplicateFrameAt(index: number): void {
    const frame = this.frames[index];
    if (frame) {
      const clone = frame.clone();
      this.addFrameAt(clone, index + 1);
    } else {
      console.error(`Frame not found in duplicateFrameAt (at ${index})`);
    }
  }

  size(): number {
    return this.frames.length;
  }

  getHash(): string {
    return this.frames.map(frame => frame.getHash()).join('-');
  }
}
