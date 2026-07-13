// Pure port of boring-avatars@2.0.4's generation algorithm
// (https://github.com/boringdesigners/boring-avatars), transcribed from its
// published dist/index.js since the package itself renders React DOM <svg>
// elements and doesn't run on React Native. Kept dependency-free (no
// react-native-svg import here) so the math can be unit tested directly —
// see generate.test.ts for golden values captured from the real package.

export type AvatarVariant = 'marble' | 'beam' | 'bauhaus' | 'ring' | 'pixel' | 'sunset';

export const AVATAR_VARIANTS: AvatarVariant[] = ['beam', 'marble', 'bauhaus', 'ring', 'pixel', 'sunset'];

// Drawn from tailwind.config.js theme colors (primary/secondary/tertiary
// containers + a surface tone) instead of upstream's demo palette, so
// generated avatars match the app's dark gold cinema branding.
export const DEFAULT_AVATAR_COLORS = ['#f5c451', '#901822', '#7fd5ff', '#3a3939', '#ffb3b0'];

export const AVATAR_VIEWBOX_SIZE: Record<AvatarVariant, number> = {
  marble: 80,
  beam: 36,
  bauhaus: 80,
  ring: 90,
  pixel: 80,
  sunset: 80,
};

export function hashCode(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getDigit(number: number, ntn: number): number {
  return Math.floor((number / Math.pow(10, ntn)) % 10);
}

function getBoolean(number: number, digit: number): boolean {
  return !(getDigit(number, digit) % 2);
}

function getUnit(number: number, range: number, index?: number): number {
  const value = number % range;
  if (index && getDigit(number, index) % 2 === 0) return -value;
  return value;
}

function getRandomColor(number: number, colors: string[], range: number): string {
  return colors[number % range];
}

function getContrast(hexColor: string): string {
  const hex = hexColor.slice(0, 1) === '#' ? hexColor.slice(1) : hexColor;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? '#000000' : '#FFFFFF';
}

export interface MarbleProperty {
  color: string;
  translateX: number;
  translateY: number;
  scale: number;
  rotate: number;
}

const MARBLE_ELEMENTS = 3;
const MARBLE_SIZE = AVATAR_VIEWBOX_SIZE.marble;

export function getMarbleProperties(name: string, colors: string[]): MarbleProperty[] {
  const hash = hashCode(name);
  const range = colors.length;
  return Array.from({ length: MARBLE_ELEMENTS }, (_, i) => ({
    color: getRandomColor(hash + i, colors, range),
    translateX: getUnit(hash * (i + 1), MARBLE_SIZE / 10, 1),
    translateY: getUnit(hash * (i + 1), MARBLE_SIZE / 10, 2),
    scale: 1.2 + getUnit(hash * (i + 1), MARBLE_SIZE / 20) / 10,
    rotate: getUnit(hash * (i + 1), 360, 1),
  }));
}

export interface BeamProperties {
  wrapperColor: string;
  faceColor: string;
  backgroundColor: string;
  wrapperTranslateX: number;
  wrapperTranslateY: number;
  wrapperRotate: number;
  wrapperScale: number;
  isMouthOpen: boolean;
  isCircle: boolean;
  eyeSpread: number;
  mouthSpread: number;
  faceRotate: number;
  faceTranslateX: number;
  faceTranslateY: number;
}

const BEAM_SIZE = AVATAR_VIEWBOX_SIZE.beam;

export function getBeamProperties(name: string, colors: string[]): BeamProperties {
  const hash = hashCode(name);
  const range = colors.length;
  const wrapperColor = getRandomColor(hash, colors, range);
  const preTranslateX = getUnit(hash, 10, 1);
  const wrapperTranslateX = preTranslateX < 5 ? preTranslateX + BEAM_SIZE / 9 : preTranslateX;
  const preTranslateY = getUnit(hash, 10, 2);
  const wrapperTranslateY = preTranslateY < 5 ? preTranslateY + BEAM_SIZE / 9 : preTranslateY;

  return {
    wrapperColor,
    faceColor: getContrast(wrapperColor),
    backgroundColor: getRandomColor(hash + 13, colors, range),
    wrapperTranslateX,
    wrapperTranslateY,
    wrapperRotate: getUnit(hash, 360),
    wrapperScale: 1 + getUnit(hash, BEAM_SIZE / 12) / 10,
    isMouthOpen: getBoolean(hash, 2),
    isCircle: getBoolean(hash, 1),
    eyeSpread: getUnit(hash, 5),
    mouthSpread: getUnit(hash, 3),
    faceRotate: getUnit(hash, 10, 3),
    faceTranslateX:
      wrapperTranslateX > BEAM_SIZE / 6 ? wrapperTranslateX / 2 : getUnit(hash, 8, 1),
    faceTranslateY:
      wrapperTranslateY > BEAM_SIZE / 6 ? wrapperTranslateY / 2 : getUnit(hash, 7, 2),
  };
}

export interface BauhausProperty {
  color: string;
  translateX: number;
  translateY: number;
  rotate: number;
  isSquare: boolean;
}

const BAUHAUS_ELEMENTS = 4;
const BAUHAUS_SIZE = AVATAR_VIEWBOX_SIZE.bauhaus;

export function getBauhausProperties(name: string, colors: string[]): BauhausProperty[] {
  const hash = hashCode(name);
  const range = colors.length;
  return Array.from({ length: BAUHAUS_ELEMENTS }, (_, i) => ({
    color: getRandomColor(hash + i, colors, range),
    translateX: getUnit(hash * (i + 1), BAUHAUS_SIZE / 2 - (i + 17), 1),
    translateY: getUnit(hash * (i + 1), BAUHAUS_SIZE / 2 - (i + 17), 2),
    rotate: getUnit(hash * (i + 1), 360),
    isSquare: getBoolean(hash, 2),
  }));
}

const RING_BASE_COLORS = 5;

// The 9-color sequence upstream builds from 5 base colors: [0,1,1,2,2,3,3,0,4].
export function getRingColors(name: string, colors: string[]): string[] {
  const hash = hashCode(name);
  const range = colors.length;
  const base = Array.from({ length: RING_BASE_COLORS }, (_, i) => getRandomColor(hash + i, colors, range));
  return [base[0], base[1], base[1], base[2], base[2], base[3], base[3], base[0], base[4]];
}

const PIXEL_ELEMENTS = 64;

export function getPixelColors(name: string, colors: string[]): string[] {
  const hash = hashCode(name);
  const range = colors.length;
  return Array.from({ length: PIXEL_ELEMENTS }, (_, i) => getRandomColor(hash % (i + 1), colors, range));
}

const SUNSET_ELEMENTS = 4;

export function getSunsetColors(name: string, colors: string[]): string[] {
  const hash = hashCode(name);
  const range = colors.length;
  return Array.from({ length: SUNSET_ELEMENTS }, (_, i) => getRandomColor(hash + i, colors, range));
}
