export const katechonPalette = {
  bg: '#050608',
  panel: '#0d1110',
  text: '#f5f2ea',
  soft: '#b8b0a4',
  muted: '#716b63',
  red: '#e04a2f',
  green: '#31d07f',
  blue: '#53a7ff',
  amber: '#f3c85e',
};

export const KatechonBackground = ({ accent = katechonPalette.green }: { accent?: string }) => (
  <>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(circle at 72% 18%, rgba(224,74,47,0.16), transparent 28%), #050608',
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
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        opacity: 0.52,
      }}
    />
    {[0, 1, 2, 3].map((index) => (
      <span
        key={index}
        style={{
          position: 'absolute',
          left: [210, 740, 1220, 1580][index],
          top: [246, 160, 520, 742][index],
          width: 10,
          height: 10,
          borderRadius: 99,
          border: '1px solid rgba(245,242,234,0.26)',
          background: index === 1 ? accent : 'rgba(224,74,47,0.42)',
          boxShadow: `0 0 24px ${index === 1 ? accent : 'rgba(224,74,47,0.42)'}`,
        }}
      />
    ))}
  </>
);
