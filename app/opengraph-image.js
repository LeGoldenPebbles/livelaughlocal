import { ImageResponse } from 'next/og';

// Site-wide social share card (og:image / twitter:image), 1200x630. Article
// pages override this with their own hero photo via generateMetadata; this
// card covers the homepage, categories, what's on and everything else.
export const alt = "Live Laugh Local - What's on near you";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #E85D3D 0%, #C74A2E 100%)',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-140px',
            right: '-140px',
            width: '440px',
            height: '440px',
            borderRadius: '50%',
            background: 'rgba(250, 247, 242, 0.14)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-180px',
            left: '-100px',
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            background: 'rgba(250, 247, 242, 0.10)',
          }}
        />
        <div
          style={{
            display: 'flex',
            fontSize: '104px',
            color: '#FAF7F2',
            letterSpacing: '-3px',
            lineHeight: 1.05,
          }}
        >
          Live Laugh Local
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: '28px',
            fontSize: '44px',
            color: '#FBEAE4',
          }}
        >
          What&apos;s on near you
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '56px' }}>
          {['Markets & Fairs', 'Food & Drink', 'Days Out'].map((c) => (
            <div
              key={c}
              style={{
                display: 'flex',
                padding: '12px 28px',
                borderRadius: '999px',
                background: 'rgba(250, 247, 242, 0.92)',
                color: '#C74A2E',
                fontSize: '28px',
              }}
            >
              {c}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
