/**
 * Transform operations for pixel art frames.
 *
 * This file is part of Piskel MCP Server.
 * Licensed under Apache License 2.0
 */

import { Frame } from '../core/Frame.js';
import { Layer } from '../core/Layer.js';
import { TRANSPARENT_COLOR_INT } from '../core/color.js';

/**
 * Flip a frame horizontally (mirror left-right).
 */
export function flipHorizontal(frame: Frame): Frame {
  const width = frame.getWidth();
  const height = frame.getHeight();
  const pixels = frame.getPixels();
  const result = new Frame(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = y * width + x;
      const dstX = width - 1 - x;
      result.setPixel(dstX, y, pixels[srcIndex]);
    }
  }

  return result;
}

/**
 * Flip a frame vertically (mirror top-bottom).
 */
export function flipVertical(frame: Frame): Frame {
  const width = frame.getWidth();
  const height = frame.getHeight();
  const pixels = frame.getPixels();
  const result = new Frame(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = y * width + x;
      const dstY = height - 1 - y;
      result.setPixel(x, dstY, pixels[srcIndex]);
    }
  }

  return result;
}

/**
 * Rotate a frame 90 degrees clockwise.
 * For non-square frames, the dimensions are swapped.
 */
export function rotate90CW(frame: Frame): Frame {
  const width = frame.getWidth();
  const height = frame.getHeight();
  const pixels = frame.getPixels();
  const result = new Frame(height, width); // swapped dimensions

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = y * width + x;
      // (x, y) -> (height - 1 - y, x)
      result.setPixel(height - 1 - y, x, pixels[srcIndex]);
    }
  }

  return result;
}

/**
 * Rotate a frame 90 degrees counter-clockwise.
 * For non-square frames, the dimensions are swapped.
 */
export function rotate90CCW(frame: Frame): Frame {
  const width = frame.getWidth();
  const height = frame.getHeight();
  const pixels = frame.getPixels();
  const result = new Frame(height, width); // swapped dimensions

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = y * width + x;
      // (x, y) -> (y, width - 1 - x)
      result.setPixel(y, width - 1 - x, pixels[srcIndex]);
    }
  }

  return result;
}

/**
 * Rotate a frame 180 degrees.
 */
export function rotate180(frame: Frame): Frame {
  const width = frame.getWidth();
  const height = frame.getHeight();
  const pixels = frame.getPixels();
  const result = new Frame(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = y * width + x;
      result.setPixel(width - 1 - x, height - 1 - y, pixels[srcIndex]);
    }
  }

  return result;
}

/**
 * Shift/move all pixels in a frame by the given offset.
 * Pixels that move out of bounds are wrapped around.
 */
export function shiftFrame(frame: Frame, dx: number, dy: number, wrap: boolean = true): Frame {
  const width = frame.getWidth();
  const height = frame.getHeight();
  const pixels = frame.getPixels();
  const result = new Frame(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = y * width + x;
      const color = pixels[srcIndex];

      if (color === TRANSPARENT_COLOR_INT) {
        continue;
      }

      let newX = x + dx;
      let newY = y + dy;

      if (wrap) {
        newX = ((newX % width) + width) % width;
        newY = ((newY % height) + height) % height;
        result.setPixel(newX, newY, color);
      } else {
        if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
          result.setPixel(newX, newY, color);
        }
      }
    }
  }

  return result;
}

/**
 * Apply a transform to a frame in-place by copying result back.
 * For same-dimension transforms, copies pixels directly.
 * For dimension-changing transforms (e.g., 90° rotation on non-square frames),
 * use applyTransformToLayer which replaces the frame in the layer.
 */
export function applyTransformToFrame(frame: Frame, transformed: Frame): void {
  if (frame.getWidth() === transformed.getWidth() && frame.getHeight() === transformed.getHeight()) {
    const pixels = transformed.getPixels();
    frame.setPixels(pixels);
  } else {
    // Dimension mismatch: cannot apply in-place.
    // Caller must use applyTransformToLayer for non-square rotations.
    throw new Error(
      `Cannot apply transform in-place: frame is ${frame.getWidth()}x${frame.getHeight()} ` +
      `but transformed is ${transformed.getWidth()}x${transformed.getHeight()}. ` +
      `Use applyTransformToLayer for dimension-changing transforms.`
    );
  }
}

/**
 * Apply a dimension-changing transform by replacing the frame in the layer.
 * Returns the new frame that was inserted.
 */
export function applyTransformToLayer(
  layer: Layer,
  frameIndex: number,
  transformed: Frame
): Frame {
  layer.removeFrameAt(frameIndex);
  layer.addFrameAt(transformed, frameIndex);
  return transformed;
}
