/**
 * brand.ts — pure, framework-free brand-kit domain logic.
 * No DOM, no AI calls here: parse the AI JSON, validate, derive tokens, export.
 * Everything testable in node.
 */

export interface Swatch {
  name: string
  hex: string
}

export interface FontPair {
  heading: string
  body: string
}

export interface BrandKit {
  brandName: string
  tagline: string
  voice: string
  palette: Swatch[]
  fonts: FontPair
  logoPrompt: string
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/** Normalize any hex-ish string to #rrggbb lowercase, or null if unparseable. */
export function normalizeHex(input: string): string | null {
  if (typeof input !== 'string') return null
  let s = input.trim().toLowerCase()
  if (!s.startsWith('#')) s = `#${s}`
  if (!HEX.test(s)) return null
  if (s.length === 4) s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`
  return s
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex) ?? '#000000'
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ]
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => clamp255(n).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/** Relative luminance per WCAG 2.1. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two hex colors (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Best readable text color (black/white) over a background hex. */
export function readableOn(bg: string): '#ffffff' | '#111111' {
  return contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#111111')
    ? '#ffffff'
    : '#111111'
}

export type WcagGrade = 'AAA' | 'AA' | 'AA Large' | 'Fail'

export function wcagGrade(ratio: number): WcagGrade {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA Large'
  return 'Fail'
}

/** Pull the first JSON object out of an LLM reply (handles ```json fences + prose). */
export function extractJson(raw: string): unknown {
  if (typeof raw !== 'string') throw new Error('empty AI reply')
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : raw
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start)
    throw new Error('no JSON object in AI reply')
  return JSON.parse(body.slice(start, end + 1))
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback
}

/** Validate + coerce a raw parsed object into a BrandKit. Throws on unusable input. */
export function toBrandKit(raw: unknown, brief: string): BrandKit {
  if (!raw || typeof raw !== 'object') throw new Error('AI returned non-object')
  const o = raw as Record<string, unknown>

  const rawPalette = Array.isArray(o.palette) ? o.palette : []
  const palette: Swatch[] = []
  for (const p of rawPalette) {
    if (!p || typeof p !== 'object') continue
    const rec = p as Record<string, unknown>
    const hex = normalizeHex(str(rec.hex))
    if (!hex) continue
    palette.push({ name: str(rec.name, `color ${palette.length + 1}`), hex })
    if (palette.length >= 6) break
  }
  if (palette.length < 3) throw new Error('AI palette too small')

  const fontsRaw = (o.fonts ?? {}) as Record<string, unknown>
  const fonts: FontPair = {
    heading: str(fontsRaw.heading, 'Inter'),
    body: str(fontsRaw.body, 'Inter'),
  }

  return {
    brandName: str(o.brandName ?? o.name, briefName(brief)),
    tagline: str(o.tagline, ''),
    voice: str(o.voice ?? o.tone, ''),
    palette,
    fonts,
    logoPrompt: str(o.logoPrompt ?? o.logo, ''),
  }
}

function briefName(brief: string): string {
  const w = brief.trim().split(/\s+/).slice(0, 2).join(' ')
  return w ? w.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Your Brand'
}

/** Map a kit's palette to the --oz-* token roles for a bespoke live re-theme. */
export function paletteToTokens(kit: BrandKit): Record<string, string> {
  const p = kit.palette
  const accent = p[0]?.hex ?? '#ff5c38'
  const surface = p[1]?.hex ?? '#f6f5f1'
  const deep = [...p].sort((a, b) => luminance(a.hex) - luminance(b.hex))[0]?.hex ?? '#111014'
  return {
    '--oz-accent': accent,
    '--oz-accent-fg': readableOn(accent),
    '--brand-1': p[0]?.hex ?? accent,
    '--brand-2': p[1]?.hex ?? surface,
    '--brand-3': p[2]?.hex ?? deep,
    '--brand-4': p[3]?.hex ?? accent,
    '--brand-5': p[4]?.hex ?? surface,
    '--brand-deep': deep,
  }
}

/** Serialize a kit's design tokens to a :root CSS block. */
export function toCssTokens(kit: BrandKit): string {
  const lines = kit.palette.map(
    (s, i) => `  --color-${slug(s.name) || `swatch-${i + 1}`}: ${s.hex};`,
  )
  return [
    `/* ${kit.brandName} — brand tokens · generated by brand.oriz.in */`,
    ':root {',
    ...lines,
    `  --font-heading: "${kit.fonts.heading}", system-ui, sans-serif;`,
    `  --font-body: "${kit.fonts.body}", system-ui, sans-serif;`,
    '}',
    '',
  ].join('\n')
}

/** Serialize a kit to a design-tokens JSON string. */
export function toJsonTokens(kit: BrandKit): string {
  return `${JSON.stringify(
    {
      brand: kit.brandName,
      tagline: kit.tagline,
      voice: kit.voice,
      colors: Object.fromEntries(
        kit.palette.map((s, i) => [slug(s.name) || `swatch-${i + 1}`, s.hex]),
      ),
      fonts: kit.fonts,
      logoPrompt: kit.logoPrompt,
    },
    null,
    2,
  )}\n`
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const BRAND_SYSTEM_PROMPT = `You are a senior brand designer. Given a short brief, invent a complete brand identity.
Return ONLY a JSON object, no prose, no markdown fences, shaped exactly:
{
  "brandName": "string",
  "tagline": "short punchy tagline, <= 8 words",
  "voice": "one sentence describing the brand voice/tone",
  "palette": [ {"name":"role e.g. Primary","hex":"#rrggbb"}, ... 5 entries, include one dark and one light ],
  "fonts": {"heading":"a real Google/font-family name","body":"a real Google/font-family name"},
  "logoPrompt": "a vivid one-sentence prompt to generate a logo concept image"
}
Pick a cohesive, accessible palette (ensure the primary works as an accent on light and dark). Fonts must be real, well-known families.`

export function buildLogoPrompt(kit: BrandKit): string {
  const colors = kit.palette
    .slice(0, 3)
    .map((s) => s.hex)
    .join(', ')
  const concept = kit.logoPrompt || `${kit.tagline || 'a distinctive mark'}`
  return `Minimal vector logo mark for "${kit.brandName}": ${concept}. Flat, geometric, high contrast, centered on plain background, brand palette ${colors}. Professional, no text, no watermark.`
}
