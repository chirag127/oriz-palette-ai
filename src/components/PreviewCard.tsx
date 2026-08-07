import { readableOn, type BrandKit } from '../lib/brand'

/**
 * A mock landing-page card that wears the generated brand — its own palette,
 * type pairing, tagline. The signature "the tool becomes the brand" moment.
 */
export function PreviewCard({
  kit,
  bg,
}: {
  kit: BrandKit
  bg: { light: string; dark: string }
}) {
  const primary = kit.palette[0]?.hex ?? '#ff5c38'
  const surface = bg.light
  const deep = kit.palette.find((s) => s.hex !== primary)?.hex ?? bg.dark
  const onPrimary = readableOn(primary)
  const onDeep = readableOn(deep)
  const heading = `"${kit.fonts.heading}", var(--oz-font-display)`
  const body = `"${kit.fonts.body}", var(--oz-font-body)`

  return (
    <div className="preview" style={{ fontFamily: body }}>
      <div className="preview__nav" style={{ background: deep, color: onDeep }}>
        <span className="preview__mark" style={{ fontFamily: heading }}>
          <span
            className="preview__dot"
            style={{ background: primary }}
            aria-hidden="true"
          />
          {kit.brandName}
        </span>
        <span className="preview__links" style={{ fontFamily: body }}>
          <span>Product</span>
          <span>Pricing</span>
          <span
            className="preview__cta preview__cta--sm"
            style={{ background: primary, color: onPrimary }}
          >
            Sign up
          </span>
        </span>
      </div>

      <div className="preview__hero" style={{ background: surface, color: '#141414' }}>
        <div className="preview__hero-copy">
          <h4 style={{ fontFamily: heading, color: '#141414' }}>
            {kit.tagline || `Meet ${kit.brandName}`}
          </h4>
          <p style={{ fontFamily: body }}>
            {kit.voice
              ? `${kit.voice}`
              : `The new way to think about ${kit.brandName.toLowerCase()}.`}
          </p>
          <span
            className="preview__cta"
            style={{ background: primary, color: onPrimary, fontFamily: body }}
          >
            Get started
          </span>
        </div>
        <div className="preview__hero-art" aria-hidden="true">
          {kit.palette.slice(0, 5).map((s) => (
            <span key={s.hex} style={{ background: s.hex }} />
          ))}
        </div>
      </div>
    </div>
  )
}
