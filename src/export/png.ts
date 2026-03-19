/**
 * PNG export functionality for pixel art.
 *
 * This file is part of Piskel MCP Server.
 * Based on Piskel (https://github.com/piskelapp/piskel)
 * Original code Copyright (C) 2011-2016 Julian Descottes
 * Licensed under Apache License 2.0
 *
 * Modifications: Converted to TypeScript, adapted for server-side usage.
 */

import { Frame } from '../core/Frame.js';
import { Piskel } from '../core/Piskel.js';
import { intToRGBA } from '../core/color.js';

/**
 * Render a frame to RGBA pixel data.
 */
export function frameToRGBA(frame: Frame): Uint8ClampedArray {
  const width = frame.width;
  const height = frame.height;
  const data = new Uint8ClampedArray(width * height * 4);
  const pixels = frame.getPixels();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = y * width + x;
      const dataIndex = pixelIndex * 4;
      const color = pixels[pixelIndex];

      if (color === 0) {
        // Transparent
        data[dataIndex] = 0;
        data[dataIndex + 1] = 0;
        data[dataIndex + 2] = 0;
        data[dataIndex + 3] = 0;
      } else {
        const rgba = intToRGBA(color);
        data[dataIndex] = rgba.r;
        data[dataIndex + 1] = rgba.g;
        data[dataIndex + 2] = rgba.b;
        data[dataIndex + 3] = rgba.a;
      }
    }
  }

  return data;
}

/**
 * Merge multiple layers into a single frame.
 */
export function mergeLayersAtFrame(
  piskel: Piskel,
  frameIndex: number
): Frame {
  const width = piskel.getWidth();
  const height = piskel.getHeight();
  const merged = new Frame(width, height);

  // Render layers from bottom to top
  for (let i = 0; i < piskel.getLayerCount(); i++) {
    const layer = piskel.getLayerAt(i);
    if (!layer) {
      continue;
    }

    const frame = layer.getFrameAt(frameIndex);
    if (!frame) {
      continue;
    }

    const pixels = frame.getPixels();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = pixels[y * width + x];
        if (color !== 0) {
          // Alpha blending (simplified: non-transparent pixels override)
          merged.setPixel(x, y, color);
        }
      }
    }
  }

  return merged;
}

/**
 * Create a sprite sheet from all frames.
 */
export function createSpriteSheet(
  piskel: Piskel,
  columns?: number
): {
  width: number;
  height: number;
  data: Uint8ClampedArray;
} {
  const frameCount = piskel.getFrameCount();
  const frameWidth = piskel.getWidth();
  const frameHeight = piskel.getHeight();

  // Calculate grid dimensions
  const cols = columns ?? Math.ceil(Math.sqrt(frameCount));
  const rows = Math.ceil(frameCount / cols);

  const sheetWidth = cols * frameWidth;
  const sheetHeight = rows * frameHeight;
  const data = new Uint8ClampedArray(sheetWidth * sheetHeight * 4);

  // Render each frame to the sprite sheet
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const merged = mergeLayersAtFrame(piskel, frameIndex);
    const frameData = frameToRGBA(merged);

    const col = frameIndex % cols;
    const row = Math.floor(frameIndex / cols);
    const offsetX = col * frameWidth;
    const offsetY = row * frameHeight;

    // Copy frame data to sheet
    for (let y = 0; y < frameHeight; y++) {
      for (let x = 0; x < frameWidth; x++) {
        const srcIndex = (y * frameWidth + x) * 4;
        const dstX = offsetX + x;
        const dstY = offsetY + y;
        const dstIndex = (dstY * sheetWidth + dstX) * 4;

        data[dstIndex] = frameData[srcIndex];
        data[dstIndex + 1] = frameData[srcIndex + 1];
        data[dstIndex + 2] = frameData[srcIndex + 2];
        data[dstIndex + 3] = frameData[srcIndex + 3];
      }
    }
  }

  return { width: sheetWidth, height: sheetHeight, data };
}

/**
 * Encode RGBA data to PNG format.
 * Uses a simple PNG encoder implementation.
 */
export function encodePNG(
  width: number,
  height: number,
  data: Uint8ClampedArray
): Uint8Array {
  // PNG signature
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // Create IHDR chunk
  const ihdr = createIHDRChunk(width, height);

  // Create IDAT chunk
  const idat = createIDATChunk(width, height, data);

  // Create IEND chunk
  const iend = createIENDChunk();

  // Combine all chunks
  const totalLength = signature.length + ihdr.length + idat.length + iend.length;
  const png = new Uint8Array(totalLength);
  let offset = 0;

  png.set(signature, offset);
  offset += signature.length;

  png.set(ihdr, offset);
  offset += ihdr.length;

  png.set(idat, offset);
  offset += idat.length;

  png.set(iend, offset);

  return png;
}

/**
 * Create PNG IHDR chunk.
 */
function createIHDRChunk(width: number, height: number): Uint8Array {
  const data = new Uint8Array(13);
  const view = new DataView(data.buffer);

  // Width
  view.setUint32(0, width, false);
  // Height
  view.setUint32(4, height, false);
  // Bit depth (8)
  data[8] = 8;
  // Color type (6 = RGBA)
  data[9] = 6;
  // Compression method (0)
  data[10] = 0;
  // Filter method (0)
  data[11] = 0;
  // Interlace method (0)
  data[12] = 0;

  return wrapChunk('IHDR', data);
}

/**
 * Create PNG IDAT chunk with RGBA data.
 */
function createIDATChunk(
  width: number,
  height: number,
  rgba: Uint8ClampedArray
): Uint8Array {
  // Add filter byte (0 = None) to each row
  const rawData = new Uint8Array(height * (1 + width * 4));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4;
      const dstIndex = rowOffset + 1 + x * 4;

      rawData[dstIndex] = rgba[srcIndex];
      rawData[dstIndex + 1] = rgba[srcIndex + 1];
      rawData[dstIndex + 2] = rgba[srcIndex + 2];
      rawData[dstIndex + 3] = rgba[srcIndex + 3];
    }
  }

  // Compress with deflate
  const compressed = deflate(rawData);

  return wrapChunk('IDAT', compressed);
}

/**
 * Create PNG IEND chunk.
 */
function createIENDChunk(): Uint8Array {
  return wrapChunk('IEND', new Uint8Array(0));
}

/**
 * Wrap data in a PNG chunk with type and CRC.
 */
function wrapChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  const view = new DataView(chunk.buffer);

  // Length
  view.setUint32(0, data.length, false);

  // Type
  for (let i = 0; i < 4; i++) {
    chunk[4 + i] = type.charCodeAt(i);
  }

  // Data
  chunk.set(data, 8);

  // CRC
  const crcData = new Uint8Array(4 + data.length);
  for (let i = 0; i < 4; i++) {
    crcData[i] = type.charCodeAt(i);
  }
  crcData.set(data, 4);

  const crc = crc32(crcData);
  view.setUint32(8 + data.length, crc, false);

  return chunk;
}

/**
 * Simple CRC32 implementation for PNG.
 */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc >>>= 1;
      }
    }
  }

  return crc ^ 0xffffffff;
}

/**
 * Simple deflate implementation (no compression, just valid format).
 * For production use, consider using zlib or pako.
 */
function deflate(data: Uint8Array): Uint8Array {
  // For small pixel art, we use uncompressed blocks
  // This is a valid but uncompressed deflate stream

  const blocks: Uint8Array[] = [];
  const maxBlockSize = 65535;
  let offset = 0;

  while (offset < data.length) {
    const remaining = data.length - offset;
    const blockSize = Math.min(remaining, maxBlockSize);
    const isLast = offset + blockSize >= data.length;

    // Block header
    const header = new Uint8Array(5);
    header[0] = isLast ? 0x01 : 0x00; // BFINAL + BTYPE (no compression)
    header[1] = blockSize & 0xff;
    header[2] = (blockSize >> 8) & 0xff;
    header[3] = ~blockSize & 0xff;
    header[4] = (~blockSize >> 8) & 0xff;

    blocks.push(header);
    blocks.push(data.slice(offset, offset + blockSize));

    offset += blockSize;
  }

  // Add zlib header and checksum
  const zlibHeader = new Uint8Array([0x78, 0x01]); // CMF, FLG (no compression)

  // Calculate Adler-32 checksum
  let s1 = 1;
  let s2 = 0;
  for (let i = 0; i < data.length; i++) {
    s1 = (s1 + data[i]) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  const adler32 = ((s2 << 16) | s1) >>> 0;

  const checksum = new Uint8Array(4);
  checksum[0] = (adler32 >> 24) & 0xff;
  checksum[1] = (adler32 >> 16) & 0xff;
  checksum[2] = (adler32 >> 8) & 0xff;
  checksum[3] = adler32 & 0xff;

  // Combine all parts
  let totalLength = zlibHeader.length + checksum.length;
  for (const block of blocks) {
    totalLength += block.length;
  }

  const result = new Uint8Array(totalLength);
  let resultOffset = 0;

  result.set(zlibHeader, resultOffset);
  resultOffset += zlibHeader.length;

  for (const block of blocks) {
    result.set(block, resultOffset);
    resultOffset += block.length;
  }

  result.set(checksum, resultOffset);

  return result;
}

/**
 * Export a single frame as PNG.
 */
export function exportFrameAsPNG(frame: Frame): Uint8Array {
  const rgba = frameToRGBA(frame);
  return encodePNG(frame.width, frame.height, rgba);
}

/**
 * Export piskel as sprite sheet PNG.
 */
export function exportSpriteSheetAsPNG(
  piskel: Piskel,
  columns?: number
): Uint8Array {
  const sheet = createSpriteSheet(piskel, columns);
  return encodePNG(sheet.width, sheet.height, sheet.data);
}

/**
 * Export a single merged frame from piskel.
 */
export function exportMergedFrameAsPNG(
  piskel: Piskel,
  frameIndex: number
): Uint8Array {
  const merged = mergeLayersAtFrame(piskel, frameIndex);
  return exportFrameAsPNG(merged);
}
