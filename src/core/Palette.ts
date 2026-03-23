/**
 * Palette management for pixel art.
 *
 * This file is part of Piskel MCP Server.
 * Licensed under Apache License 2.0
 */

/**
 * Palette represents a set of colors used in pixel art creation.
 */
export class Palette {
  private name: string;
  private colors: string[];

  constructor(name: string, colors: string[] = []) {
    this.name = name;
    this.colors = [...colors];
  }

  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    this.name = name;
  }

  getColors(): string[] {
    return [...this.colors];
  }

  getColorAt(index: number): string | undefined {
    return this.colors[index];
  }

  getColorCount(): number {
    return this.colors.length;
  }

  addColor(color: string): void {
    const normalized = color.toUpperCase();
    if (!this.colors.includes(normalized)) {
      this.colors.push(normalized);
    }
  }

  removeColor(color: string): void {
    const normalized = color.toUpperCase();
    const index = this.colors.indexOf(normalized);
    if (index !== -1) {
      this.colors.splice(index, 1);
    }
  }

  removeColorAt(index: number): void {
    if (index >= 0 && index < this.colors.length) {
      this.colors.splice(index, 1);
    }
  }

  hasColor(color: string): boolean {
    return this.colors.includes(color.toUpperCase());
  }

  clear(): void {
    this.colors = [];
  }

  toJSON(): object {
    return {
      name: this.name,
      colors: this.colors,
    };
  }
}

/**
 * Pre-defined classic pixel art palettes.
 */
export const PRESET_PALETTES: Record<string, { name: string; colors: string[] }> = {
  pico8: {
    name: 'PICO-8',
    colors: [
      '#000000', '#1D2B53', '#7E2553', '#008751',
      '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
      '#FF004D', '#FFA300', '#FFEC27', '#00E436',
      '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA',
    ],
  },
  db16: {
    name: 'DB16 (DawnBringer)',
    colors: [
      '#140C1C', '#442434', '#30346D', '#4E4A4E',
      '#854C30', '#346524', '#D04648', '#757161',
      '#597DCE', '#D27D2C', '#8595A1', '#6DAA2C',
      '#D2AA99', '#6DC2CA', '#DAD45E', '#DEEED6',
    ],
  },
  db32: {
    name: 'DB32 (DawnBringer)',
    colors: [
      '#000000', '#222034', '#45283C', '#663931',
      '#8F563B', '#DF7126', '#D9A066', '#EEC39A',
      '#FBF236', '#99E550', '#6ABE30', '#37946E',
      '#4B692F', '#524B24', '#323C39', '#3F3F74',
      '#306082', '#5B6EE1', '#639BFF', '#5FCDE4',
      '#CBDBFC', '#FFFFFF', '#9BADB7', '#847E87',
      '#696A6A', '#595652', '#76428A', '#AC3232',
      '#D95763', '#D77BBA', '#8F974A', '#8A6F30',
    ],
  },
  nes: {
    name: 'NES',
    colors: [
      '#000000', '#FCFCFC', '#F8F8F8', '#BCBCBC',
      '#7C7C7C', '#A4E4FC', '#3CBCFC', '#0078F8',
      '#0000FC', '#B8B8F8', '#6888FC', '#0058F8',
      '#0000BC', '#D8B8F8', '#9878F8', '#6844FC',
      '#4428BC', '#F8B8F8', '#F878F8', '#D800CC',
      '#940084', '#F8A4C0', '#F85898', '#E40058',
      '#A80020', '#F0D0B0', '#F87858', '#F83800',
      '#A81000', '#FCE0A8', '#FCA044', '#E45C10',
      '#881400', '#F8D878', '#F8B800', '#AC7C00',
      '#503000', '#D8F878', '#B8F818', '#00B800',
      '#007800', '#B8F8B8', '#58D854', '#00A800',
      '#006800', '#B8F8D8', '#58F898', '#00A844',
      '#005800', '#00FCFC', '#00E8D8', '#008888',
      '#004058', '#F8D8F8', '#787878',
    ],
  },
  gameboy: {
    name: 'Game Boy',
    colors: [
      '#0F380F', '#306230', '#8BAC0F', '#9BBC0F',
    ],
  },
  cga: {
    name: 'CGA',
    colors: [
      '#000000', '#555555', '#AAAAAA', '#FFFFFF',
      '#0000AA', '#5555FF', '#00AA00', '#55FF55',
      '#00AAAA', '#55FFFF', '#AA0000', '#FF5555',
      '#AA00AA', '#FF55FF', '#AA5500', '#FFFF55',
    ],
  },
  endesga32: {
    name: 'ENDESGA 32',
    colors: [
      '#BE4A2F', '#D77643', '#EAD4AA', '#E4A672',
      '#B86F50', '#733E39', '#3E2731', '#A22633',
      '#E43B44', '#F77622', '#FEAE34', '#FEE761',
      '#63C74D', '#3E8948', '#265C42', '#193C3E',
      '#124E89', '#0099DB', '#2CE8F5', '#FFFFFF',
      '#C0CBDC', '#8B9BB4', '#5A6988', '#3A4466',
      '#262B44', '#181425', '#FF0044', '#68386C',
      '#B55088', '#F6757A', '#E8B796', '#C28569',
    ],
  },
  sweetie16: {
    name: 'Sweetie 16',
    colors: [
      '#1A1C2C', '#5D275D', '#B13E53', '#EF7D57',
      '#FFCD75', '#A7F070', '#38B764', '#257179',
      '#29366F', '#3B5DC9', '#41A6F6', '#73EFF7',
      '#F4F4F4', '#94B0C2', '#566C86', '#333C57',
    ],
  },
};

/**
 * Get a preset palette by key.
 */
export function getPresetPalette(key: string): Palette | null {
  const preset = PRESET_PALETTES[key.toLowerCase()];
  if (!preset) {
    return null;
  }
  return new Palette(preset.name, preset.colors);
}

/**
 * List all available preset palette keys and names.
 */
export function listPresetPalettes(): Array<{ key: string; name: string; colorCount: number }> {
  return Object.entries(PRESET_PALETTES).map(([key, value]) => ({
    key,
    name: value.name,
    colorCount: value.colors.length,
  }));
}
