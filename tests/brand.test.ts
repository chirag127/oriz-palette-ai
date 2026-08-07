import { describe, expect, it } from 'vitest'
import {
  buildLogoPrompt,
  contrastRatio,
  extractJson,
  hexToRgb,
  luminance,
  normalizeHex,
  paletteToTokens,
  readableOn,
  rgbToHex,
  slug,
  toBrandKit,
  toCssTokens,
  toJsonTokens,
  wcagGrade,
  type BrandKit,
} from '../src/lib/brand'

const kit: BrandKit = {
  brandName: 'Nimbus',
  tagline: 'Weather, quietly',
  voice: 'calm and precise',
  palette: [
    { name: 'Primary', hex: '#2f6df6' },
    { name: 'Surface', hex: '#f6f7fb' },
    { name: 'Ink', hex: '#0d1220' },
    { name: 'Mist', hex: '#c7d3ea' },
    { name: 'Signal', hex: '#ff8a3d' },
  ],
  fonts: { heading: 'Space Grotesk', body: 'Inter' },
  logoPrompt: 'a soft cloud curl forming an N',
}

describe('normalizeHex', () => {
  it('expands shorthand + lowercases + adds #', () => {
    expect(normalizeHex('FFF')).toBe('#ffffff')
    expect(normalizeHex('#AbC')).toBe('#aabbcc')
    expect(normalizeHex('  #FF5C38 ')).toBe('#ff5c38')
  })
  it('rejects garbage', () => {
    expect(normalizeHex('nope')).toBeNull()
    expect(normalizeHex('#12')).toBeNull()
    expect(normalizeHex('#gggggg')).toBeNull()
  })
})

describe('rgb round-trip', () => {
  it('hex->rgb->hex is stable', () => {
    expect(hexToRgb('#ff5c38')).toEqual([255, 92, 56])
    expect(rgbToHex(255, 92, 56)).toBe('#ff5c38')
    expect(rgbToHex(300, -5, 128)).toBe('#ff0080')
  })
})

describe('wcag', () => {
  it('luminance bounds', () => {
    expect(luminance('#ffffff')).toBeCloseTo(1, 3)
    expect(luminance('#000000')).toBeCloseTo(0, 3)
  })
  it('contrast black/white is 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })
  it('grades', () => {
    expect(wcagGrade(21)).toBe('AAA')
    expect(wcagGrade(4.6)).toBe('AA')
    expect(wcagGrade(3.2)).toBe('AA Large')
    expect(wcagGrade(1.5)).toBe('Fail')
  })
  it('readableOn picks legible ink', () => {
    expect(readableOn('#ffffff')).toBe('#111111')
    expect(readableOn('#0d1220')).toBe('#ffffff')
  })
})

describe('extractJson', () => {
  it('parses fenced json', () => {
    const out = extractJson('```json\n{"a":1}\n```') as { a: number }
    expect(out.a).toBe(1)
  })
  it('parses json embedded in prose', () => {
    const out = extractJson('Here you go: {"b":2} enjoy') as { b: number }
    expect(out.b).toBe(2)
  })
  it('throws without json', () => {
    expect(() => extractJson('no braces here')).toThrow()
  })
})

describe('toBrandKit', () => {
  it('coerces a well-formed object', () => {
    const k = toBrandKit(
      {
        brandName: 'Aero',
        tagline: 'fly light',
        palette: [
          { name: 'P', hex: '2f6df6' },
          { name: 'S', hex: '#fff' },
          { name: 'I', hex: '#000' },
        ],
        fonts: { heading: 'Poppins', body: 'Inter' },
        logoPrompt: 'wing',
      },
      'travel app',
    )
    expect(k.brandName).toBe('Aero')
    expect(k.palette).toHaveLength(3)
    expect(k.palette[0].hex).toBe('#2f6df6')
  })
  it('drops invalid swatches + falls back to brief for name', () => {
    const k = toBrandKit(
      {
        palette: [
          { name: 'ok', hex: '#123456' },
          { name: 'bad', hex: 'zzz' },
          { name: 'ok2', hex: '#654321' },
          { name: 'ok3', hex: '#abcdef' },
        ],
      },
      'cloud kitchen brand',
    )
    expect(k.palette).toHaveLength(3)
    expect(k.brandName).toBe('Cloud Kitchen')
  })
  it('throws when fewer than 3 valid swatches', () => {
    expect(() =>
      toBrandKit({ palette: [{ name: 'x', hex: '#111' }] }, 'x'),
    ).toThrow()
  })
})

describe('token exports', () => {
  it('paletteToTokens maps accent + brand roles', () => {
    const t = paletteToTokens(kit)
    expect(t['--oz-accent']).toBe('#2f6df6')
    expect(t['--brand-1']).toBe('#2f6df6')
    expect(t['--brand-deep']).toBe('#0d1220')
    expect(t['--oz-accent-fg']).toMatch(/^#/)
  })
  it('css tokens contain vars + fonts', () => {
    const css = toCssTokens(kit)
    expect(css).toContain('--color-primary: #2f6df6;')
    expect(css).toContain('--font-heading: "Space Grotesk"')
    expect(css).toContain(':root {')
  })
  it('json tokens parse back', () => {
    const parsed = JSON.parse(toJsonTokens(kit))
    expect(parsed.brand).toBe('Nimbus')
    expect(parsed.colors.primary).toBe('#2f6df6')
    expect(parsed.fonts.body).toBe('Inter')
  })
})

describe('slug + logo prompt', () => {
  it('slugs names', () => {
    expect(slug('Deep Space!')).toBe('deep-space')
    expect(slug('  A/B  ')).toBe('a-b')
  })
  it('logo prompt includes palette + name', () => {
    const p = buildLogoPrompt(kit)
    expect(p).toContain('Nimbus')
    expect(p).toContain('#2f6df6')
    expect(p.toLowerCase()).toContain('no text')
  })
})
