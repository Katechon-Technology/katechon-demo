import type { DesignSystem, Page, SlideMeta } from '@open-slide/core';

export const design: DesignSystem = {
  palette: { bg: '#050608', text: '#f5f2ea', accent: '#31d07f' },
  fonts: {
    display: 'Arial, Helvetica, system-ui, sans-serif',
    body: 'Arial, Helvetica, system-ui, sans-serif',
  },
  typeScale: { hero: 150, body: 34 },
  radius: 8,
};

const slideData = {
  eyebrow: 'Generated live',
  headline: 'Software needs\na live container.',
  line: 'Screenshots prove demand, but they destroy state.',
  accent: 'green',
  cards: [
    { label: 'Old container', value: 'page / feed / video', note: 'Great for artifacts, weak for state.' },
    { label: 'New supply', value: 'software generated on demand', note: 'AI makes interfaces cheap to compose.' },
    { label: 'Katechon', value: 'live channels', note: 'Stateful surfaces people command and share.' },
  ],
  trail: ['repo context', 'company memory', 'Open Slide page'],
};

const accentColors = {
  red: '#e04a2f',
  green: '#31d07f',
  blue: '#53a7ff',
  amber: '#f3c85e',
};

const fill = {
  width: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
  background: 'var(--osd-bg)',
  color: 'var(--osd-text)',
  fontFamily: 'var(--osd-font-body)',
  letterSpacing: 0,
} as const;

const Background = ({ accent }: { accent: string }) => (
  <>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'linear-gradient(rgba(245,242,234,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(245,242,234,0.025) 1px, transparent 1px)',
        backgroundSize: '96px 96px',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 118,
        right: 118,
        top: 128,
        height: 1,
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        opacity: 0.52,
      }}
    />
    <div
      style={{
        position: 'absolute',
        right: 160,
        top: 126,
        width: 12,
        height: 12,
        borderRadius: 99,
        background: accent,
        boxShadow: `0 0 32px ${accent}`,
      }}
    />
  </>
);

const LiveGenerated: Page = () => {
  const accent = accentColors[slideData.accent as keyof typeof accentColors];

  return (
    <div style={fill}>
      <Background accent={accent} />
      <section style={{ position: 'absolute', left: 132, top: 168, width: 980 }}>
        <p style={{ margin: 0, color: accent, fontFamily: 'monospace', fontSize: 24, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
          {slideData.eyebrow}
        </p>
        <h1 style={{ margin: '34px 0 0', fontFamily: 'var(--osd-font-display)', fontSize: 'var(--osd-size-hero)', lineHeight: 0.95, fontWeight: 950, letterSpacing: 0, whiteSpace: 'pre-line' }}>
          {slideData.headline}
        </h1>
        <p style={{ width: 760, margin: '42px 0 0', color: '#b8b0a4', fontSize: 38, lineHeight: 1.35, letterSpacing: 0 }}>
          {slideData.line}
        </p>
      </section>
      <section style={{ position: 'absolute', right: 132, bottom: 150, width: 610, display: 'grid', gap: 18 }}>
        {slideData.cards.map((card, index) => (
          <article
            key={card.label}
            style={{
              border: '1px solid rgba(245,242,234,0.13)',
              borderLeft: `4px solid ${index === 0 ? '#e04a2f' : accent}`,
              borderRadius: 8,
              padding: '22px 26px',
              background: 'rgba(13,17,16,0.72)',
            }}
          >
            <p style={{ margin: 0, color: '#716b63', fontFamily: 'monospace', fontSize: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
              {card.label}
            </p>
            <strong style={{ display: 'block', marginTop: 8, color: '#f5f2ea', fontSize: 34, lineHeight: 1.1, letterSpacing: 0 }}>
              {card.value}
            </strong>
            <span style={{ display: 'block', marginTop: 8, color: '#b8b0a4', fontSize: 24, lineHeight: 1.35, letterSpacing: 0 }}>
              {card.note}
            </span>
          </article>
        ))}
      </section>
      <footer style={{ position: 'absolute', left: 132, right: 132, bottom: 72, display: 'flex', gap: 14 }}>
        {slideData.trail.map((item) => (
          <span key={item} style={{ border: '1px solid rgba(245,242,234,0.12)', borderRadius: 999, padding: '10px 14px', color: '#b8b0a4', fontFamily: 'monospace', fontSize: 18, textTransform: 'uppercase', letterSpacing: 0 }}>
            {item}
          </span>
        ))}
      </footer>
    </div>
  );
};

export const meta: SlideMeta = { title: 'Live Generated Example', theme: 'dark' };
export const notes: Record<number, string> = {
  0: 'Use this as a reference for live generated Katechon slides. Keep the background grammar stable while changing composition and content.',
};

export default [LiveGenerated] satisfies Page[];
