import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'icons')
await mkdir(out, { recursive: true })

const BG = '#111014'
const PAPER = '#f6f5f1'
const ACCENT = '#ff5c38'

// signature mark: two overlapping circles (paper + accent) over a bar, on deep ground
const mark = (s, pad) => {
  const g = 512 - pad * 2
  const cy = pad + g * 0.4
  const r = g * 0.155
  const c1x = pad + g * 0.36
  const c2x = pad + g * 0.64
  const barW = g * 0.56
  const barH = g * 0.135
  const barX = pad + (g - barW) / 2
  const barY = pad + g * 0.66
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 512 512"><rect width="512" height="512" fill="${BG}"/><circle cx="${c1x}" cy="${cy}" r="${r}" fill="${PAPER}"/><circle cx="${c2x}" cy="${cy}" r="${r}" fill="${ACCENT}"/><rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="${barH / 2}" fill="${PAPER}"/></svg>`
}

const anySvg = mark(512, 24)
const maskSvg = mark(512, 92) // maskable safe-zone padding (~18%)

await writeFile(join(out, 'icon.svg'), anySvg)
await writeFile(join(out, 'icon-maskable.svg'), maskSvg)

for (const size of [192, 256, 384, 512]) {
  await sharp(Buffer.from(anySvg)).resize(size, size).png().toFile(join(out, `icon-${size}.png`))
}
await sharp(Buffer.from(maskSvg)).resize(512, 512).png().toFile(join(out, 'icon-maskable-512.png'))

console.log('icons written to', out)
