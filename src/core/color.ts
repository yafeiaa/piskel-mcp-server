/**
 * Color utilities for pixel art operations.
 *
 * This file is derived from Piskel (https://github.com/piskelapp/piskel)
 * Original work Copyright 2017 Julian Descottes
 * Licensed under Apache License 2.0
 *
 * Modifications:
 * - Converted from JavaScript to TypeScript
 * - Removed browser DOM dependencies
 * - Added pure algorithmic color parsing
 */

// Transparent color represented as 0 (rgba(0,0,0,0))
export const TRANSPARENT_COLOR = 'rgba(0,0,0,0)';
export const TRANSPARENT_COLOR_INT = 0;

// Color name to hex mapping for common colors
const COLOR_NAMES: Record<string, string> = {
  transparent: 'rgba(0,0,0,0)',
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#00ff00',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  gray: '#808080',
  grey: '#808080',
  orange: '#ffa500',
  pink: '#ffc0cb',
  purple: '#800080',
  brown: '#a52a2a',
};

// Caches for performance
const colorToIntCache = new Map<string, number>();
const intToColorCache = new Map<number, string>();

/**
 * Convert a color component (0-255) to its 2-character hex representation.
 */
export function componentToHex(c: number): string {
  const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}

/**
 * Convert RGB values to hex color string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

/**
 * Convert RGBA values to rgba() color string.
 */
export function rgbaToString(r: number, g: number, b: number, a: number): string {
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Parse a color string and return RGBA components.
 * Supports: hex (#RGB, #RRGGBB, #RRGGBBAA), rgb(), rgba(), color names
 */
export function parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
  if (!color || typeof color !== 'string') {
    return null;
  }

  const trimmed = color.trim().toLowerCase();

  // Check color names first
  if (COLOR_NAMES[trimmed]) {
    return parseColor(COLOR_NAMES[trimmed]);
  }

  // Handle hex colors
  if (trimmed.startsWith('#')) {
    return parseHexColor(trimmed);
  }

  // Handle rgb() and rgba()
  if (trimmed.startsWith('rgb')) {
    return parseRgbColor(trimmed);
  }

  return null;
}

/**
 * Parse hex color string (#RGB, #RRGGBB, #RRGGBBAA).
 */
function parseHexColor(hex: string): { r: number; g: number; b: number; a: number } | null {
  const h = hex.slice(1);

  if (h.length === 3) {
    // #RGB -> #RRGGBB
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
      a: 1,
    };
  }

  if (h.length === 6) {
    // #RRGGBB
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }

  if (h.length === 8) {
    // #RRGGBBAA
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: parseInt(h.slice(6, 8), 16) / 255,
    };
  }

  return null;
}

/**
 * Parse rgb() or rgba() color string.
 */
function parseRgbColor(rgb: string): { r: number; g: number; b: number; a: number } | null {
  const match = rgb.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (!match) {
    return null;
  }

  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1,
  };
}

/**
 * Convert a color string to a Uint32 integer value.
 * Format: AABBGGRR (little-endian for ImageData compatibility)
 *
 * Derived from pskl.utils.colorToInt in Piskel.
 */
export function colorToInt(color: string | number): number {
  if (typeof color === 'number') {
    return color;
  }

  const cached = colorToIntCache.get(color);
  if (cached !== undefined) {
    return cached;
  }

  const parsed = parseColor(color);
  if (!parsed) {
    return TRANSPARENT_COLOR_INT;
  }

  const { r, g, b, a } = parsed;
  const alpha = Math.round(a * 255);

  // If fully transparent, return 0
  if (alpha === 0) {
    colorToIntCache.set(color, TRANSPARENT_COLOR_INT);
    return TRANSPARENT_COLOR_INT;
  }

  // AABBGGRR format (little-endian)
  const intValue = ((alpha << 24) >>> 0) + (b << 16) + (g << 8) + r;

  colorToIntCache.set(color, intValue);
  intToColorCache.set(intValue, color);

  return intValue;
}

/**
 * Convert a Uint32 integer value to a color string.
 * Format: AABBGGRR (little-endian) -> rgba()
 *
 * Derived from pskl.utils.intToColor in Piskel.
 */
export function intToColor(intValue: number): string {
  if (typeof intValue === 'string') {
    return intValue;
  }

  const cached = intToColorCache.get(intValue);
  if (cached !== undefined) {
    return cached;
  }

  const r = intValue & 0xff;
  const g = (intValue >> 8) & 0xff;
  const b = (intValue >> 16) & 0xff;
  const a = ((intValue >> 24) >>> 0 & 0xff) / 255;

  const color = rgbaToString(r, g, b, a);

  colorToIntCache.set(color, intValue);
  intToColorCache.set(intValue, color);

  return color;
}

/**
 * Convert int to hex string (for display purposes).
 */
export function intToHex(intValue: number): string {
  const r = intValue & 0xff;
  const g = (intValue >> 8) & 0xff;
  const b = (intValue >> 16) & 0xff;
  return rgbToHex(r, g, b);
}

/**
 * Convert int to RGBA components.
 */
export function intToRGBA(intValue: number): { r: number; g: number; b: number; a: number } {
  return {
    r: intValue & 0xff,
    g: (intValue >> 8) & 0xff,
    b: (intValue >> 16) & 0xff,
    a: ((intValue >> 24) >>> 0) & 0xff,
  };
}

/**
 * Check if a color is transparent.
 */
export function isTransparent(color: string | number): boolean {
  const intValue = typeof color === 'string' ? colorToInt(color) : color;
  return intValue === TRANSPARENT_COLOR_INT || ((intValue >> 24) >>> 0 & 0xff) === 0;
}

/**
 * Blend two colors with alpha compositing.
 */
export function blendColors(fg: number, bg: number): number {
  const fgA = ((fg >> 24) >>> 0 & 0xff) / 255;
  const bgA = ((bg >> 24) >>> 0 & 0xff) / 255;

  if (fgA === 0) {
    return bg;
  }

  if (fgA === 1 || bgA === 0) {
    return fg;
  }

  const fgR = fg & 0xff;
  const fgG = (fg >> 8) & 0xff;
  const fgB = (fg >> 16) & 0xff;

  const bgR = bg & 0xff;
  const bgG = (bg >> 8) & 0xff;
  const bgB = (bg >> 16) & 0xff;

  const outA = fgA + bgA * (1 - fgA);
  const outR = Math.round((fgR * fgA + bgR * bgA * (1 - fgA)) / outA);
  const outG = Math.round((fgG * fgA + bgG * bgA * (1 - fgA)) / outA);
  const outB = Math.round((fgB * fgA + bgB * bgA * (1 - fgA)) / outA);
  const outAInt = Math.round(outA * 255);

  return ((outAInt << 24) >>> 0) + (outB << 16) + (outG << 8) + outR;
}
