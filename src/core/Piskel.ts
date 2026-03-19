/**
 * Piskel model - the main container for pixel art projects.
 *
 * This file is derived from Piskel (https://github.com/piskelapp/piskel)
 * Original work Copyright 2017 Julian Descottes
 * Licensed under Apache License 2.0
 *
 * Modifications:
 * - Converted from JavaScript to TypeScript
 * - Removed browser event dependencies
 * - Added type definitions
 */

import { Frame } from './Frame.js';
import { Layer } from './Layer.js';

export interface PiskelDescriptor {
  name: string;
  description?: string;
}

/**
 * Piskel is the main container for a pixel art project.
 * It contains layers, dimensions, and animation settings.
 */
export class Piskel {
  readonly width: number;
  readonly height: number;

  private layers: Layer[];
  private fps: number;
  private descriptor: PiskelDescriptor;
  private savePath: string | null;
  private hiddenFrames: number[];

  constructor(width: number, height: number, fps: number, descriptor: PiskelDescriptor) {
    if (!width || !height || !descriptor) {
      throw new Error(`Missing arguments in Piskel constructor: width=${width}, height=${height}`);
    }

    this.width = width;
    this.height = height;
    this.fps = fps;
    this.descriptor = descriptor;
    this.layers = [];
    this.savePath = null;
    this.hiddenFrames = [];
  }

  /**
   * Create a Piskel from existing layers.
   */
  static fromLayers(layers: Layer[], fps: number, descriptor: PiskelDescriptor): Piskel {
    if (layers.length === 0 || layers[0].size() === 0) {
      throw new Error('Piskel.fromLayers expects array of non-empty layers');
    }

    const sampleFrame = layers[0].getFrameAt(0)!;
    const piskel = new Piskel(
      sampleFrame.getWidth(),
      sampleFrame.getHeight(),
      fps,
      descriptor
    );

    layers.forEach(layer => piskel.addLayer(layer));
    return piskel;
  }

  getLayers(): Layer[] {
    return this.layers;
  }

  getHeight(): number {
    return this.height;
  }

  getWidth(): number {
    return this.width;
  }

  getFPS(): number {
    return this.fps;
  }

  setFPS(fps: number): void {
    this.fps = fps;
  }

  getLayerAt(index: number): Layer | undefined {
    return this.layers[index];
  }

  getLayersByName(name: string): Layer[] {
    return this.layers.filter(l => l.getName() === name);
  }

  getLayerCount(): number {
    return this.layers.length;
  }

  getFrameCount(): number {
    const firstLayer = this.getLayerAt(0);
    return firstLayer ? firstLayer.size() : 0;
  }

  addLayer(layer: Layer): void {
    this.layers.push(layer);
  }

  addLayerAt(layer: Layer, index: number): void {
    this.layers.splice(index, 0, layer);
  }

  /**
   * Move layer up (towards front).
   */
  moveLayerUp(layer: Layer, toTop: boolean = false): void {
    const index = this.layers.indexOf(layer);
    if (index === -1) {
      return;
    }
    const toIndex = toTop ? this.layers.length - 1 : index + 1;
    this.moveLayer(index, toIndex);
  }

  /**
   * Move layer down (towards back).
   */
  moveLayerDown(layer: Layer, toBottom: boolean = false): void {
    const index = this.layers.indexOf(layer);
    if (index === -1) {
      return;
    }
    const toIndex = toBottom ? 0 : index - 1;
    this.moveLayer(index, toIndex);
  }

  /**
   * Move layer from one index to another.
   */
  private moveLayer(fromIndex: number, toIndex: number): void {
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return;
    }

    toIndex = Math.max(0, Math.min(toIndex, this.layers.length - 1));
    const layer = this.layers.splice(fromIndex, 1)[0];
    this.layers.splice(toIndex, 0, layer);
  }

  removeLayer(layer: Layer): void {
    const index = this.layers.indexOf(layer);
    if (index !== -1) {
      this.layers.splice(index, 1);
    }
  }

  removeLayerAt(index: number): void {
    if (this.layers[index]) {
      this.layers.splice(index, 1);
    }
  }

  getDescriptor(): PiskelDescriptor {
    return this.descriptor;
  }

  setDescriptor(descriptor: PiskelDescriptor): void {
    this.descriptor = descriptor;
  }

  setName(name: string): void {
    this.descriptor.name = name;
  }

  getName(): string {
    return this.descriptor.name;
  }

  getHash(): string {
    return this.layers.map(layer => layer.getHash()).join('-');
  }

  getSavePath(): string | null {
    return this.savePath;
  }

  setSavePath(path: string | null): void {
    this.savePath = path;
  }

  /**
   * Get a specific frame from a layer.
   */
  getFrame(layerIndex: number, frameIndex: number): Frame | undefined {
    const layer = this.getLayerAt(layerIndex);
    return layer?.getFrameAt(frameIndex);
  }

  /**
   * Add a new frame to all layers.
   */
  addFrameToAllLayers(): void {
    for (const layer of this.layers) {
      const newFrame = new Frame(this.width, this.height);
      layer.addFrame(newFrame);
    }
  }

  /**
   * Remove a frame from all layers at the given index.
   */
  removeFrameFromAllLayers(frameIndex: number): void {
    for (const layer of this.layers) {
      layer.removeFrameAt(frameIndex);
    }
  }

  /**
   * Duplicate a frame across all layers.
   */
  duplicateFrameInAllLayers(frameIndex: number): void {
    for (const layer of this.layers) {
      layer.duplicateFrameAt(frameIndex);
    }
  }

  /**
   * Convert to a serializable object.
   */
  toJSON(): object {
    return {
      width: this.width,
      height: this.height,
      fps: this.fps,
      descriptor: this.descriptor,
      layers: this.layers.map(layer => ({
        name: layer.getName(),
        opacity: layer.getOpacity(),
        frames: layer.getFrames().map(frame => frame.toArray()),
      })),
    };
  }
}
