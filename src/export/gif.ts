/**
 * GIF export functionality for pixel art animations.
 *
 * This file is part of Piskel MCP Server.
 * Based on Piskel (https://github.com/piskelapp/piskel)
 * Original code Copyright (C) 2011-2016 Julian Descottes
 * Licensed under Apache License 2.0
 *
 * Modifications: Converted to TypeScript, uses custom GIF encoder.
 */

import { Piskel } from '../core/Piskel.js';
import { mergeLayersAtFrame, frameToRGBA, scaleRGBAData } from './png.js';

/**
 * GIF encoder for creating animated GIFs.
 */
class GIFEncoder {
  private width: number;
  private height: number;
  private frames: Array<{
    data: Uint8ClampedArray;
    delay: number;
  }> = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /**
   * Add a frame to the animation.
   */
  addFrame(data: Uint8ClampedArray, delay: number): void {
    this.frames.push({ data, delay });
  }

  /**
   * Encode the GIF.
   */
  encode(): Uint8Array {
    const output: number[] = [];

    // GIF Header
    this.writeHeader(output);

    // Logical Screen Descriptor
    this.writeLogicalScreenDescriptor(output);

    // Global Color Table
    const globalColorTable = this.buildColorTable();
    this.writeColorTable(output, globalColorTable);

    // Netscape Application Extension (for looping)
    this.writeNetscapeExtension(output);

    // Write each frame
    for (const frame of this.frames) {
      this.writeFrame(output, frame.data, frame.delay, globalColorTable);
    }

    // GIF Trailer
    output.push(0x3b);

    return new Uint8Array(output);
  }

  private writeHeader(output: number[]): void {
    // GIF89a
    const header = 'GIF89a';
    for (let i = 0; i < header.length; i++) {
      output.push(header.charCodeAt(i));
    }
  }

  private writeLogicalScreenDescriptor(output: number[]): void {
    // Width (little-endian)
    output.push(this.width & 0xff);
    output.push((this.width >> 8) & 0xff);

    // Height (little-endian)
    output.push(this.height & 0xff);
    output.push((this.height >> 8) & 0xff);

    // Packed byte:
    // - Global Color Table Flag: 1
    // - Color Resolution: 7 (8 bits per primary color)
    // - Sort Flag: 0
    // - Size of Global Color Table: 7 (2^(7+1) = 256 colors)
    output.push(0xf7);

    // Background Color Index
    output.push(0);

    // Pixel Aspect Ratio
    output.push(0);
  }

  private buildColorTable(): Map<number, number> {
    const colorMap = new Map<number, number>();
    let colorIndex = 0;

    // Reserve index 0 for transparent
    colorMap.set(0, 0);
    colorIndex++;

    // Collect all unique colors from all frames
    for (const frame of this.frames) {
      for (let i = 0; i < frame.data.length; i += 4) {
        const r = frame.data[i];
        const g = frame.data[i + 1];
        const b = frame.data[i + 2];
        const a = frame.data[i + 3];

        if (a === 0) {
          continue; // Transparent
        }

        const color = (r << 16) | (g << 8) | b;
        if (!colorMap.has(color) && colorIndex < 256) {
          colorMap.set(color, colorIndex++);
        }
      }
    }

    return colorMap;
  }

  private writeColorTable(output: number[], colorMap: Map<number, number>): void {
    const tableSize = 256;
    const colors: Array<[number, number, number]> = new Array(tableSize).fill([0, 0, 0]);

    for (const [color, index] of colorMap) {
      const r = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const b = color & 0xff;
      colors[index] = [r, g, b];
    }

    for (const [r, g, b] of colors) {
      output.push(r);
      output.push(g);
      output.push(b);
    }
  }

  private writeNetscapeExtension(output: number[], loopCount: number = 0): void {
    // Application Extension
    output.push(0x21); // Extension introducer
    output.push(0xff); // Application Extension Label

    // Block size
    output.push(11);

    // Application identifier
    const netscape = 'NETSCAPE2.0';
    for (let i = 0; i < netscape.length; i++) {
      output.push(netscape.charCodeAt(i));
    }

    // Sub-block
    output.push(3); // Sub-block size
    output.push(1); // Loop sub-block ID
    output.push(loopCount & 0xff); // Loop count low byte (0 = infinite)
    output.push((loopCount >> 8) & 0xff); // Loop count high byte

    // Block terminator
    output.push(0);
  }

  private writeFrame(
    output: number[],
    data: Uint8ClampedArray,
    delay: number,
    colorMap: Map<number, number>
  ): void {
    // Graphic Control Extension
    this.writeGraphicControlExtension(output, delay);

    // Image Descriptor
    this.writeImageDescriptor(output);

    // Image Data
    this.writeImageData(output, data, colorMap);
  }

  private writeGraphicControlExtension(output: number[], delay: number): void {
    output.push(0x21); // Extension introducer
    output.push(0xf9); // Graphic Control Label

    output.push(4); // Block size

    // Packed byte:
    // - Disposal method: 2 (restore to background)
    // - User input flag: 0
    // - Transparent color flag: 1
    output.push(0x09);

    // Delay time (in centiseconds)
    const delayCs = Math.round(delay / 10);
    output.push(delayCs & 0xff);
    output.push((delayCs >> 8) & 0xff);

    // Transparent color index
    output.push(0);

    // Block terminator
    output.push(0);
  }

  private writeImageDescriptor(output: number[]): void {
    output.push(0x2c); // Image separator

    // Image left position
    output.push(0);
    output.push(0);

    // Image top position
    output.push(0);
    output.push(0);

    // Image width
    output.push(this.width & 0xff);
    output.push((this.width >> 8) & 0xff);

    // Image height
    output.push(this.height & 0xff);
    output.push((this.height >> 8) & 0xff);

    // Packed byte (no local color table)
    output.push(0);
  }

  private writeImageData(
    output: number[],
    data: Uint8ClampedArray,
    colorMap: Map<number, number>
  ): void {
    // Convert RGBA to indexed color
    const indexed: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a === 0) {
        indexed.push(0); // Transparent
      } else {
        const color = (r << 16) | (g << 8) | b;
        indexed.push(colorMap.get(color) ?? 0);
      }
    }

    // LZW encode
    const lzwMinCodeSize = 8;
    output.push(lzwMinCodeSize);

    const encoded = this.lzwEncode(indexed, lzwMinCodeSize);

    // Write in sub-blocks (max 255 bytes each)
    let offset = 0;
    while (offset < encoded.length) {
      const blockSize = Math.min(255, encoded.length - offset);
      output.push(blockSize);
      for (let i = 0; i < blockSize; i++) {
        output.push(encoded[offset + i]);
      }
      offset += blockSize;
    }

    // Block terminator
    output.push(0);
  }

  private lzwEncode(data: number[], minCodeSize: number): number[] {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;

    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;

    const dictionary = new Map<string, number>();
    for (let i = 0; i < clearCode; i++) {
      dictionary.set(String(i), i);
    }

    const output: number[] = [];
    let buffer = 0;
    let bufferBits = 0;

    const emit = (code: number) => {
      buffer |= code << bufferBits;
      bufferBits += codeSize;

      while (bufferBits >= 8) {
        output.push(buffer & 0xff);
        buffer >>= 8;
        bufferBits -= 8;
      }
    };

    // Clear code
    emit(clearCode);

    if (data.length === 0) {
      emit(eoiCode);
      if (bufferBits > 0) {
        output.push(buffer);
      }
      return output;
    }

    let current = String(data[0]);

    for (let i = 1; i < data.length; i++) {
      const next = String(data[i]);
      const combined = current + ',' + next;

      if (dictionary.has(combined)) {
        current = combined;
      } else {
        emit(dictionary.get(current)!);

        if (nextCode < 4096) {
          dictionary.set(combined, nextCode++);

          if (nextCode > 1 << codeSize && codeSize < 12) {
            codeSize++;
          }
        } else {
          // Clear and reset dictionary
          emit(clearCode);
          codeSize = minCodeSize + 1;
          nextCode = eoiCode + 1;
          dictionary.clear();
          for (let j = 0; j < clearCode; j++) {
            dictionary.set(String(j), j);
          }
        }

        current = next;
      }
    }

    emit(dictionary.get(current)!);
    emit(eoiCode);

    if (bufferBits > 0) {
      output.push(buffer);
    }

    return output;
  }
}

/**
 * Export piskel as animated GIF.
 */
export function exportAsGIF(
  piskel: Piskel,
  frameDelay: number = 100,
  scale: number = 1
): Uint8Array {
  const width = piskel.getWidth();
  const height = piskel.getHeight();
  const frameCount = piskel.getFrameCount();

  const outputWidth = scale > 1 ? width * scale : width;
  const outputHeight = scale > 1 ? height * scale : height;

  const encoder = new GIFEncoder(outputWidth, outputHeight);

  for (let i = 0; i < frameCount; i++) {
    const merged = mergeLayersAtFrame(piskel, i);
    let rgba = frameToRGBA(merged);

    if (scale > 1) {
      const scaled = scaleRGBAData(rgba, width, height, scale);
      rgba = scaled.data;
    }

    encoder.addFrame(rgba, frameDelay);
  }

  return encoder.encode();
}

/**
 * Export piskel as GIF with custom frame delays.
 */
export function exportAsGIFWithDelays(
  piskel: Piskel,
  frameDelays: number[]
): Uint8Array {
  const width = piskel.getWidth();
  const height = piskel.getHeight();
  const frameCount = piskel.getFrameCount();

  const encoder = new GIFEncoder(width, height);

  for (let i = 0; i < frameCount; i++) {
    const merged = mergeLayersAtFrame(piskel, i);
    const rgba = frameToRGBA(merged);
    const delay = frameDelays[i] ?? 100;
    encoder.addFrame(rgba, delay);
  }

  return encoder.encode();
}
