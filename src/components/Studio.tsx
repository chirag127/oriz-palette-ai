import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { downloadBlob } from '@chirag127/oz-file'
import {
  BRAND_SYSTEM_PROMPT,
  buildLogoPrompt,
  contrastRatio,
  extractJson,
  paletteToTokens,
  readableOn,
  toBrandKit,
  toCssTokens,
  toJsonTokens,
  wcagGrade,
  type BrandKit,
} from '../lib/brand'
import { PreviewCard } from './PreviewCard'
import '../styles/studio.css'

type Status = 'idle' | 'thinking' | 'ready' | 'error'
type LogoStatus = 'idle' | 'loading' | 'ready' | 'error'

const EXAMPLES = [
  'a calm sleep-tracking app for new parents',
  'an artisanal cold-brew coffee subscription',
  'a bold indie game studio making retro shooters',
  'a premium electric-bike rental service',
  'a friendly personal-finance app for freshers',
]

export default function Studio() {
  const [brief, setBrief] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [kit, setKit] = useState<BrandKit | null>(null)
  const [logo, setLogo] = useState('')
  const [logoStatus, setLogoStatus] = useState<LogoStatus>('idle')
  const [logoError, setLogoError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(async (b: string) => {
    const text = b.trim()
    if (!text) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setStatus('thinking')
    setError('')
    setLogo('')
    setLogoStatus('idle')
    setLogoError('')
    try {
      const { complete } = await import('@chirag127/oz-ai')
      const reply = await complete(`Brief: ${text}`, {
        system: BRAND_SYSTEM_PROMPT,
        signal: ac.signal,
      })
      const parsed = extractJson(reply)
      const next = toBrandKit(parsed, text)
      if (ac.signal.aborted) return
      setKit(next)
      setStatus('ready')
    } catch (e) {
      if (ac.signal.aborted) return
      setError(
        e instanceof Error ? e.message : 'generation failed — try again',
      )
      setStatus('error')
    }
  }, [])

  const generateLogo = useCallback(async () => {
    if (!kit) return
    setLogoStatus('loading')
    setLogoError('')
    try {
      const { image } = await import('@chirag127/oz-ai')
      const url = await image(buildLogoPrompt(kit), { model: 'flux' })
      setLogo(url)
      setLogoStatus('ready')
    } catch (e) {
      setLogoError(
        e instanceof Error ? e.message : 'logo providers busy — retry',
      )
      setLogoStatus('error')
    }
  }, [kit])

  // Live re-theme: apply the generated palette to :root custom props.
  useEffect(() => {
    const root = document.documentElement
    const applied = kit ? paletteToTokens(kit) : null
    if (applied) for (const [k, v] of Object.entries(applied)) root.style.setProperty(k, v)
    return () => {
      if (applied) for (const k of Object.keys(applied)) root.style.removeProperty(k)
    }
  }, [kit])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void generate(brief)
  }

  const exportCss = () => {
    if (!kit) return
    downloadBlob(
      new Blob([toCssTokens(kit)], { type: 'text/css' }),
      `${slugName(kit.brandName)}-tokens.css`,
    )
  }
  const exportJson = () => {
    if (!kit) return
    downloadBlob(
      new Blob([toJsonTokens(kit)], { type: 'application/json' }),
      `${slugName(kit.brandName)}-tokens.json`,
    )
  }

  return (
    <div className="studio">
      <form className="brief" onSubmit={onSubmit}>
        <label className="brief__label" htmlFor="brief">
          Your brief
        </label>
        <div className="brief__row">
          <input
            id="brief"
            className="brief__input"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="e.g. a warm neighborhood bakery with a modern edge"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            className="brief__go"
            type="submit"
            disabled={status === 'thinking' || !brief.trim()}
          >
            {status === 'thinking' ? 'Designing…' : 'Generate'}
          </button>
        </div>
        <div className="brief__examples">
          <span>try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="chip"
              onClick={() => {
                setBrief(ex)
                void generate(ex)
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {status === 'thinking' && (
        <div className="panel panel--busy" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          Designing your identity… palette, type, voice.
        </div>
      )}

      {status === 'error' && (
        <div className="panel panel--error" role="alert">
          <strong>Couldn’t generate.</strong> {error}
          <button
            type="button"
            className="chip chip--ghost"
            onClick={() => void generate(brief)}
          >
            retry
          </button>
        </div>
      )}

      {status === 'idle' && (
        <div className="panel panel--empty">
          <p>
            No brand yet. Describe one above — or tap an example. AI runs
            in-browser via a keyless multi-provider fallback; if every provider
            is down you’ll get a clear error, nothing breaks.
          </p>
        </div>
      )}

      {kit && (status === 'ready' || status === 'error') && (
        <Result
          kit={kit}
          logo={logo}
          logoStatus={logoStatus}
          logoError={logoError}
          onLogo={generateLogo}
          onExportCss={exportCss}
          onExportJson={exportJson}
        />
      )}
    </div>
  )
}

function Result({
  kit,
  logo,
  logoStatus,
  logoError,
  onLogo,
  onExportCss,
  onExportJson,
}: {
  kit: BrandKit
  logo: string
  logoStatus: LogoStatus
  logoError: string
  onLogo: () => void
  onExportCss: () => void
  onExportJson: () => void
}) {
  const [copied, setCopied] = useState('')
  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(''), 1200)
    } catch {
      /* clipboard blocked — noop */
    }
  }

  const bestBg = useMemo(() => {
    const light = '#ffffff'
    const dark = kit.palette.find((s) => contrastRatio(s.hex, '#ffffff') >= 4.5)
    return { light, dark: dark?.hex ?? '#111111' }
  }, [kit])

  return (
    <div className="result">
      <header className="result__head">
        <div>
          <p className="eyebrow">generated identity</p>
          <h2 className="result__name">{kit.brandName}</h2>
          {kit.tagline && <p className="result__tagline">“{kit.tagline}”</p>}
          {kit.voice && <p className="result__voice">Voice — {kit.voice}</p>}
        </div>
        <div className="result__exports">
          <button type="button" className="chip" onClick={onExportCss}>
            export CSS
          </button>
          <button type="button" className="chip" onClick={onExportJson}>
            export JSON
          </button>
        </div>
      </header>

      <div className="grid">
        <section className="card">
          <h3 className="card__title">Palette</h3>
          <div className="swatches">
            {kit.palette.map((s) => {
              const ratioWhite = contrastRatio(s.hex, '#ffffff')
              const ink = readableOn(s.hex)
              return (
                <button
                  key={s.hex + s.name}
                  type="button"
                  className="swatch"
                  style={{ background: s.hex, color: ink }}
                  onClick={() => copy(s.hex, s.hex)}
                  title={`copy ${s.hex}`}
                >
                  <span className="swatch__name">{s.name}</span>
                  <span className="swatch__hex">
                    {copied === s.hex ? 'copied!' : s.hex}
                  </span>
                  <span className="swatch__wcag">
                    on&nbsp;white {wcagGrade(ratioWhite)}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="card">
          <h3 className="card__title">Type pairing</h3>
          <div className="type">
            <div className="type__row">
              <span className="type__role">Heading</span>
              <span
                className="type__spec"
                style={{ fontFamily: `"${kit.fonts.heading}", var(--oz-font-display)` }}
              >
                {kit.fonts.heading}
              </span>
            </div>
            <p
              className="type__sample type__sample--h"
              style={{ fontFamily: `"${kit.fonts.heading}", var(--oz-font-display)` }}
            >
              {kit.brandName}
            </p>
            <div className="type__row">
              <span className="type__role">Body</span>
              <span
                className="type__spec"
                style={{ fontFamily: `"${kit.fonts.body}", var(--oz-font-body)` }}
              >
                {kit.fonts.body}
              </span>
            </div>
            <p
              className="type__sample"
              style={{ fontFamily: `"${kit.fonts.body}", var(--oz-font-body)` }}
            >
              The quick brown fox jumps over the lazy dog. 0123456789
            </p>
            <p className="type__note">
              Live-previewed with system fallback. Add the real families from
              Google Fonts in your build.
            </p>
          </div>
        </section>
      </div>

      <section className="card card--wide">
        <div className="card__head-row">
          <h3 className="card__title">Landing preview</h3>
          <span className="card__hint">re-themed to {kit.brandName}</span>
        </div>
        <PreviewCard kit={kit} bg={bestBg} />
      </section>

      <div className="grid">
        <section className="card">
          <div className="card__head-row">
            <h3 className="card__title">Logo concept</h3>
            <button
              type="button"
              className="chip"
              onClick={onLogo}
              disabled={logoStatus === 'loading'}
            >
              {logoStatus === 'loading' ? 'rendering…' : logo ? 'regenerate' : 'generate logo'}
            </button>
          </div>
          <div className="logo">
            {logoStatus === 'idle' && !logo && (
              <p className="logo__hint">
                Optional. Renders a concept via flux (lazy-loaded, ~a few
                seconds). The prompt below works in any image model too.
              </p>
            )}
            {logoStatus === 'loading' && (
              <div className="logo__box logo__box--busy">
                <span className="spinner" aria-hidden="true" /> rendering concept…
              </div>
            )}
            {logoStatus === 'error' && (
              <p className="logo__err" role="alert">
                {logoError}
              </p>
            )}
            {logo && (
              <img
                className="logo__img"
                src={logo}
                alt={`${kit.brandName} logo concept`}
                loading="lazy"
              />
            )}
          </div>
        </section>

        <section className="card">
          <div className="card__head-row">
            <h3 className="card__title">Logo prompt</h3>
            <button
              type="button"
              className="chip chip--ghost"
              onClick={() => copy('prompt', buildLogoPrompt(kit))}
            >
              {copied === 'prompt' ? 'copied!' : 'copy'}
            </button>
          </div>
          <pre className="prompt">{buildLogoPrompt(kit)}</pre>
        </section>
      </div>
    </div>
  )
}

function slugName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'brand'
}
