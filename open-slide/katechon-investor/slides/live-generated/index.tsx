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
  "eyebrow": "Builder-market fit",
  "headline": "A founder who ships the channel layer, not screenshots",
  "line": "Katechon is built by people who understand how distribution containers, live state, and realtime runtime constraints collide—so the product stays commandable and shareable.",
  "accent": "green",
  "strategy": "teamCredibility",
  "composition": "splitCards",
  "narration": "You’re not hiring a “dashboard” team. The founder background bridges market-native urgency with frontier realtime systems, turning generated software into live channel objects with provenance-backed state and a morphing surface. That’s what makes Katechon investor-credible: the runtime and the product truth line up.",
  "prompt": "tell me about the founder",
  "slideNumber": 1,
  "generatedAt": "2026-05-10T15:32:08.181Z",
  "cards": [
    {
      "label": "Why Katechon exists",
      "value": "post-page internet",
      "note": "The channel is the container that preserves live generated state, focus, provenance, and writable session..."
    },
    {
      "label": "What the team built",
      "value": "normalized channel contracts",
      "note": "One API layer for live/context/query/state + specialist agents that update session state and replace surfaces."
    },
    {
      "label": "What the runtime proves",
      "value": "realtime state transitions",
      "note": "Whole-surface morphing via turn→morph→narrate→offer next action, designed to be replayed and forked as an..."
    },
    {
      "label": "What they optimize for",
      "value": "watch • command • share • fork",
      "note": "If a feature doesn’t strengthen those verbs, it’s cut—so the product behaves like software, not media."
    }
  ],
  "nodes": [
    "channel layer runtime",
    "normalized channel APIs",
    "specialist agents",
    "generated state +..."
  ],
  "trail": [
    "channel layer runtime",
    "normalized channel APIs",
    "specialist agents",
    "generated state +..."
  ],
  "telemetry": [
    "channel layer...",
    "normalized...",
    "specialist agents",
    "generated...",
    "repo",
    "context",
    "schema",
    "react"
  ]
} as const;

const accentColors = {
  red: '#e04a2f',
  green: '#31d07f',
  blue: '#53a7ff',
  amber: '#f3c85e',
};

const palette = {
  panel: '#0d1110',
  panelHi: '#141a18',
  soft: '#b8b0a4',
  muted: '#716b63',
  line: 'rgba(245,242,234,0.14)',
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
        background:
          'radial-gradient(circle at 72% 18%, rgba(224,74,47,0.16), transparent 28%), radial-gradient(circle at 18% 86%, rgba(49,208,127,0.10), transparent 30%), #050608',
      }}
    />
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
        background: 'linear-gradient(90deg, transparent, ' + accent + ', transparent)',
        opacity: 0.52,
      }}
    />
    {[0, 1, 2, 3, 4, 5].map((index) => (
      <span
        key={index}
        style={{
          position: 'absolute',
          left: [210, 740, 1220, 1580, 450, 1450][index],
          top: [246, 160, 520, 742, 860, 300][index],
          width: 10,
          height: 10,
          borderRadius: 99,
          border: '1px solid rgba(245,242,234,0.26)',
          background: index === 1 ? accent : 'rgba(224,74,47,0.42)',
          boxShadow: '0 0 24px ' + (index === 1 ? accent : 'rgba(224,74,47,0.42)'),
        }}
      />
    ))}
  </>
);

const Eyebrow = ({ accent }: { accent: string }) => (
  <p style={{ margin: 0, color: accent, fontFamily: 'monospace', fontSize: 24, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
    {slideData.eyebrow}
  </p>
);

const Headline = ({ compact = false }: { compact?: boolean }) => (
  <section style={{ width: compact ? 760 : 980 }}>
    <h1 style={{ margin: '30px 0 0', fontFamily: 'var(--osd-font-display)', fontSize: compact ? 118 : 'var(--osd-size-hero)', lineHeight: compact ? 0.98 : 0.95, fontWeight: 950, letterSpacing: 0, whiteSpace: 'pre-line' }}>
      {slideData.headline}
    </h1>
    <p style={{ width: compact ? 700 : 820, margin: '38px 0 0', color: palette.soft, fontSize: compact ? 32 : 38, lineHeight: 1.35, letterSpacing: 0 }}>
      {slideData.line}
    </p>
  </section>
);

const Footer = () => (
  <footer style={{ position: 'absolute', left: 132, right: 132, bottom: 72, display: 'flex', gap: 14 }}>
    {slideData.trail.map((item) => (
      <span key={item} style={{ border: '1px solid rgba(245,242,234,0.12)', borderRadius: 999, padding: '10px 14px', color: palette.soft, fontFamily: 'monospace', fontSize: 18, textTransform: 'uppercase', letterSpacing: 0 }}>
        {item}
      </span>
    ))}
  </footer>
);

const CardsColumn = ({ accent }: { accent: string }) => (
  <div style={{ display: 'grid', gap: 18 }}>
    {slideData.cards.map((card, index) => (
      <article
        key={card.label}
        style={{
          border: '1px solid rgba(245,242,234,0.13)',
          borderLeft: '4px solid ' + (index === 0 ? '#e04a2f' : accent),
          borderRadius: 8,
          padding: '22px 26px',
          background: 'rgba(13,17,16,0.72)',
        }}
      >
        <p style={{ margin: 0, color: palette.muted, fontFamily: 'monospace', fontSize: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
          {card.label}
        </p>
        <strong style={{ display: 'block', marginTop: 8, color: '#f5f2ea', fontSize: 34, lineHeight: 1.1, letterSpacing: 0 }}>
          {card.value}
        </strong>
        <span style={{ display: 'block', marginTop: 8, color: palette.soft, fontSize: 24, lineHeight: 1.35, letterSpacing: 0 }}>
          {card.note}
        </span>
      </article>
    ))}
  </div>
);

const ChainDiagram = ({ accent }: { accent: string }) => (
  <div style={{ position: 'relative', width: 720, height: 460 }}>
    {slideData.cards.map((card, index) => (
      <div key={card.label} style={{ position: 'absolute', left: index * 78, top: 40 + index * 76, width: 390, padding: 24, border: '1px solid rgba(245,242,234,0.14)', borderRadius: 8, background: index === slideData.cards.length - 1 ? 'rgba(49,208,127,0.10)' : 'rgba(13,17,16,0.82)' }}>
        <span style={{ color: index === slideData.cards.length - 1 ? accent : palette.muted, fontFamily: 'monospace', fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>{card.label}</span>
        <strong style={{ display: 'block', marginTop: 10, fontSize: 32, lineHeight: 1.08, letterSpacing: 0 }}>{card.value}</strong>
      </div>
    ))}
    {[0, 1, 2].map((index) => (
      <span key={index} style={{ position: 'absolute', left: 370 + index * 78, top: 122 + index * 76, width: 120, height: 1, background: accent, transform: 'rotate(32deg)', opacity: 0.62 }} />
    ))}
  </div>
);

const OrbitDiagram = ({ accent }: { accent: string }) => (
  <div style={{ position: 'relative', width: 660, height: 590 }}>
    <div style={{ position: 'absolute', left: 185, top: 160, width: 290, height: 290, borderRadius: 999, border: '1px solid rgba(245,242,234,0.18)', display: 'grid', placeItems: 'center', color: '#f5f2ea', fontSize: 42, fontWeight: 900, background: 'rgba(13,17,16,0.76)', boxShadow: '0 0 60px rgba(0,0,0,0.45)' }}>
      CHANNEL
    </div>
    {slideData.nodes.slice(0, 6).map((node, index) => {
      const points = [[300, 30], [520, 118], [534, 386], [300, 510], [76, 386], [70, 118]][index] || [300, 30];
      return (
        <div key={node} style={{ position: 'absolute', left: points[0], top: points[1], transform: 'translate(-50%, -50%)', minWidth: 132, padding: '14px 18px', border: '1px solid rgba(245,242,234,0.16)', borderRadius: 999, color: index === 0 ? accent : palette.soft, background: 'rgba(5,6,8,0.88)', textAlign: 'center', fontFamily: 'monospace', fontSize: 19, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
          {node}
        </div>
      );
    })}
  </div>
);

const TimelineDiagram = ({ accent }: { accent: string }) => (
  <div style={{ width: 720, display: 'grid', gap: 18 }}>
    {slideData.nodes.slice(0, 6).map((node, index) => (
      <div key={node} style={{ display: 'grid', gridTemplateColumns: '72px 1fr', alignItems: 'center', gap: 18 }}>
        <span style={{ width: 56, height: 56, borderRadius: 99, display: 'grid', placeItems: 'center', color: index === 0 ? '#050608' : accent, background: index === 0 ? accent : 'transparent', border: '1px solid ' + accent, fontFamily: 'monospace', fontSize: 19, fontWeight: 900 }}>{String(index + 1).padStart(2, '0')}</span>
        <div style={{ border: '1px solid rgba(245,242,234,0.13)', borderRadius: 8, padding: '18px 22px', color: '#f5f2ea', background: 'rgba(13,17,16,0.72)', fontSize: 34, fontWeight: 850, letterSpacing: 0 }}>{node}</div>
      </div>
    ))}
  </div>
);

const MatrixDiagram = ({ accent }: { accent: string }) => (
  <div style={{ width: 720, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
    {slideData.cards.map((card, index) => (
      <article key={card.label} style={{ minHeight: 174, padding: 24, border: '1px solid rgba(245,242,234,0.13)', borderTop: '4px solid ' + (index === 0 ? accent : 'rgba(245,242,234,0.18)'), borderRadius: 8, background: 'rgba(13,17,16,0.72)' }}>
        <p style={{ margin: 0, color: index === 0 ? accent : palette.muted, fontFamily: 'monospace', fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>{card.label}</p>
        <strong style={{ display: 'block', marginTop: 18, fontSize: 32, lineHeight: 1.08, letterSpacing: 0 }}>{card.value}</strong>
        <span style={{ display: 'block', marginTop: 12, color: palette.soft, fontSize: 22, lineHeight: 1.35, letterSpacing: 0 }}>{card.note}</span>
      </article>
    ))}
  </div>
);

const ConstellationDiagram = ({ accent }: { accent: string }) => (
  <div style={{ position: 'relative', width: 720, height: 560 }}>
    <div style={{ position: 'absolute', left: 260, top: 206, width: 200, height: 200, borderRadius: 999, display: 'grid', placeItems: 'center', border: '1px solid rgba(245,242,234,0.18)', color: accent, fontSize: 34, fontWeight: 900, background: 'rgba(13,17,16,0.82)' }}>STATE</div>
    {slideData.nodes.slice(0, 7).map((node, index) => {
      const points = [[120, 70], [520, 62], [630, 250], [500, 470], [144, 460], [55, 260], [360, 28]][index] || [120, 70];
      return (
        <div key={node} style={{ position: 'absolute', left: points[0], top: points[1], width: 142, minHeight: 58, padding: '14px 16px', border: '1px solid rgba(245,242,234,0.14)', borderRadius: 8, color: palette.soft, background: 'rgba(5,6,8,0.86)', fontFamily: 'monospace', fontSize: 17, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>{node}</div>
      );
    })}
  </div>
);

const TerminalDiagram = ({ accent }: { accent: string }) => (
  <div style={{ width: 720, border: '1px solid rgba(245,242,234,0.14)', borderRadius: 8, background: 'rgba(5,6,8,0.9)', overflow: 'hidden' }}>
    <div style={{ height: 54, display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', borderBottom: '1px solid rgba(245,242,234,0.10)' }}>
      {[0, 1, 2].map((i) => <span key={i} style={{ width: 13, height: 13, borderRadius: 99, background: ['#e04a2f', '#f3c85e', '#31d07f'][i] }} />)}
      <span style={{ marginLeft: 12, color: palette.muted, fontFamily: 'monospace', fontSize: 16, letterSpacing: 0 }}>open-slide/live-generated</span>
    </div>
    <div style={{ padding: '26px 28px 30px', display: 'grid', gap: 16, fontFamily: 'monospace', fontSize: 24, lineHeight: 1.35, letterSpacing: 0 }}>
      {slideData.telemetry.slice(0, 7).map((item, index) => (
        <div key={item + index} style={{ color: index === slideData.telemetry.length - 1 ? accent : palette.soft }}>
          <span style={{ color: palette.muted }}>$ </span>{item}
        </div>
      ))}
      <div style={{ color: accent }}>$ mount state --validated</div>
    </div>
  </div>
);

const StackDiagram = ({ accent }: { accent: string }) => (
  <div style={{ width: 700, display: 'grid', gap: 0 }}>
    {slideData.nodes.slice(0, 6).map((node, index) => (
      <div key={node} style={{ marginLeft: index * 34, marginTop: index ? -10 : 0, width: 520, padding: '22px 26px', border: '1px solid rgba(245,242,234,0.14)', borderRadius: 8, background: index === 0 ? 'rgba(49,208,127,0.11)' : 'rgba(13,17,16,0.76)', color: index === 0 ? accent : '#f5f2ea', fontSize: 34, fontWeight: 850, letterSpacing: 0 }}>
        {node}
      </div>
    ))}
  </div>
);

const Visual = ({ accent }: { accent: string }) => {
  if (slideData.composition === 'chain') return <ChainDiagram accent={accent} />;
  if (slideData.composition === 'orbit') return <OrbitDiagram accent={accent} />;
  if (slideData.composition === 'timeline') return <TimelineDiagram accent={accent} />;
  if (slideData.composition === 'matrix') return <MatrixDiagram accent={accent} />;
  if (slideData.composition === 'constellation') return <ConstellationDiagram accent={accent} />;
  if (slideData.composition === 'terminal') return <TerminalDiagram accent={accent} />;
  if (slideData.composition === 'stack') return <StackDiagram accent={accent} />;
  return <CardsColumn accent={accent} />;
};

const LiveGenerated: Page = () => {
  const accent = accentColors[slideData.accent as keyof typeof accentColors] || accentColors.green;
  const isStatement = slideData.composition === 'terminal' || slideData.composition === 'chain';

  return (
    <div style={fill}>
      <Background accent={accent} />
      <section style={{ position: 'absolute', left: 132, top: isStatement ? 150 : 142 }}>
        <Eyebrow accent={accent} />
        <Headline compact={!isStatement && slideData.composition !== 'splitCards'} />
      </section>
      <section style={{ position: 'absolute', right: 118, bottom: isStatement ? 142 : 128, width: slideData.composition === 'splitCards' ? 610 : 760 }}>
        <Visual accent={accent} />
      </section>
      <Footer />
    </div>
  );
};

export const meta: SlideMeta = {
  title: slideData.headline.replace(/\s+/g, ' ').slice(0, 80),
  theme: 'dark',
};

export const notes: Record<number, string> = {
  0: slideData.narration,
};

export default [LiveGenerated] satisfies Page[];
