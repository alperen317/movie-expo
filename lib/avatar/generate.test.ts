import {
  DEFAULT_AVATAR_COLORS,
  getBauhausProperties,
  getBeamProperties,
  getMarbleProperties,
  getPixelColors,
  getRingColors,
  getSunsetColors,
  hashCode,
} from './generate';

// Golden values below were captured by rendering the real boring-avatars@2.0.4
// package (react-dom/server renderToStaticMarkup) for name="Alperen Aslan"
// with DEFAULT_AVATAR_COLORS, then reading the resulting SVG's fill/transform
// attributes. This is a regression test for the manual port in generate.ts —
// a sign-flip or off-by-one in the transcribed algorithm would silently
// produce a different (but still deterministic) avatar without this check.
const NAME = 'Alperen Aslan';

describe('hashCode', () => {
  it('is deterministic for the same input', () => {
    expect(hashCode(NAME)).toBe(hashCode(NAME));
  });

  it('differs for different names', () => {
    expect(hashCode(NAME)).not.toBe(hashCode('Someone Else'));
  });
});

describe('getMarbleProperties', () => {
  it('matches the real boring-avatars marble output', () => {
    const props = getMarbleProperties(NAME, DEFAULT_AVATAR_COLORS);
    expect(props[0].color).toBe('#901822');
    expect(props[1]).toMatchObject({ color: '#7fd5ff', translateX: 4, translateY: 4, rotate: 12 });
    expect(props[2]).toMatchObject({ color: '#3a3939', translateX: 6, translateY: 6, rotate: 198 });
    // Upstream's marble component reuses props[2].scale for BOTH shapes'
    // "scale(...)" transform (see BoringAvatar.tsx) — props[1].scale is
    // computed but never rendered, so it isn't part of the observable golden
    // output and isn't asserted here.
    expect(props[2].scale).toBeCloseTo(1.4);
  });
});

describe('getBeamProperties', () => {
  it('matches the real boring-avatars beam output', () => {
    const props = getBeamProperties(NAME, DEFAULT_AVATAR_COLORS);
    expect(props).toMatchObject({
      wrapperColor: '#901822',
      faceColor: '#FFFFFF',
      backgroundColor: '#ffb3b0',
      wrapperTranslateX: -2,
      wrapperTranslateY: -2,
      wrapperRotate: 186,
      wrapperScale: 1,
      isCircle: true,
      isMouthOpen: true,
      eyeSpread: 1,
      mouthSpread: 0,
      faceRotate: -6,
      faceTranslateX: -2,
      faceTranslateY: -6,
    });
  });
});

describe('getBauhausProperties', () => {
  it('matches the real boring-avatars bauhaus output', () => {
    const props = getBauhausProperties(NAME, DEFAULT_AVATAR_COLORS);
    expect(props[0].color).toBe('#901822');
    expect(props[1]).toMatchObject({ color: '#7fd5ff', translateX: 4, translateY: 4, rotate: 12, isSquare: true });
    expect(props[2]).toMatchObject({ color: '#3a3939', translateX: 18, translateY: 18 });
    expect(props[3]).toMatchObject({ color: '#ffb3b0', translateX: -4, translateY: -4, rotate: 24 });
  });
});

describe('getRingColors', () => {
  it('matches the real boring-avatars ring output', () => {
    expect(getRingColors(NAME, DEFAULT_AVATAR_COLORS)).toEqual([
      '#901822',
      '#7fd5ff',
      '#7fd5ff',
      '#3a3939',
      '#3a3939',
      '#ffb3b0',
      '#ffb3b0',
      '#901822',
      '#f5c451',
    ]);
  });
});

describe('getSunsetColors', () => {
  it('matches the real boring-avatars sunset output', () => {
    expect(getSunsetColors(NAME, DEFAULT_AVATAR_COLORS)).toEqual([
      '#901822',
      '#7fd5ff',
      '#3a3939',
      '#ffb3b0',
    ]);
  });
});

describe('getPixelColors', () => {
  it('matches the real boring-avatars pixel output', () => {
    expect(getPixelColors(NAME, DEFAULT_AVATAR_COLORS)).toEqual([
      '#f5c451', '#f5c451', '#f5c451', '#7fd5ff', '#901822', '#f5c451', '#901822', '#7fd5ff',
      '#901822', '#901822', '#7fd5ff', '#901822', '#7fd5ff', '#901822', '#901822', '#7fd5ff',
      '#901822', '#901822', '#901822', '#901822', '#901822', '#7fd5ff', '#3a3939', '#3a3939',
      '#901822', '#f5c451', '#ffb3b0', '#901822', '#ffb3b0', '#901822', '#7fd5ff', '#7fd5ff',
      '#ffb3b0', '#901822', '#901822', '#901822', '#7fd5ff', '#f5c451', '#3a3939', '#901822',
      '#ffb3b0', '#901822', '#ffb3b0', '#7fd5ff', '#901822', '#901822', '#f5c451', '#3a3939',
      '#3a3939', '#901822', '#3a3939', '#901822', '#7fd5ff', '#ffb3b0', '#901822', '#ffb3b0',
      '#ffb3b0', '#3a3939', '#3a3939', '#901822', '#7fd5ff', '#3a3939', '#901822', '#7fd5ff',
    ]);
  });
});
