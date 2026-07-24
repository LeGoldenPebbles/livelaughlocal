/**
 * Branded house graphic generator.
 *
 * Every article needs a hero. Preference order is always:
 *   1. a Spaces Please event photo,
 *   2. an openly-licensed photo (Wikimedia Commons CC, credited),
 *   3. THIS - a branded editorial graphic, for stories where no honest
 *      photograph exists (tech, money, weather, abstract news).
 *
 * Usage:
 *   node scripts/make-news-graphic.mjs --slug my-article --motif ticket \
 *     --label "24 JULY 2026 - UK" [--tone ink|coral]
 *
 * Writes public/news/<slug>.png at 1600x900 and prints the relative URL to use
 * as heroImage.url (credit: "Graphic: Live Laugh Local").
 *
 * REMEMBER: the PNG must be committed AND deployed before any live article
 * points at it - config/asset first, data second.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const slug = arg('slug');
const motif = arg('motif', 'star');
const label = arg('label', '');
const tone = arg('tone', 'ink');

if (!slug) {
  console.error('Missing --slug. See the header of this file for usage.');
  process.exit(1);
}

// Brand sheet.
const PAPER = '#F7F2EA';
const INK = '#181715';
const CORAL = '#EF5A3C';
const SAGE = '#DCE4DA';
const GREEN = '#385348';

const dark = tone !== 'coral';
const bg = dark ? INK : CORAL;
const blob = dark ? '#221E1B' : '#D14328';
const figure = dark ? PAPER : PAPER;
const accent = dark ? CORAL : PAPER;
const labelColour = dark ? '#8A847A' : 'rgba(247,242,234,0.75)';

/**
 * Motifs are drawn on a 1600x900 canvas, centred around (800, 430).
 * Each returns raw SVG. Keep them simple, flat and unmistakable at
 * thumbnail size - these are read at 300px wide in a feed.
 */
const MOTIFS = {
  // Generic: the brand asterisk, big.
  star: () => {
    const rays = [];
    for (let i = 0; i < 8; i += 1) {
      const angle = (i * Math.PI) / 4;
      rays.push(
        `<rect x="790" y="250" width="20" height="150" rx="10" fill="${accent}" transform="rotate(${(i * 45).toFixed(0)} 800 430)"/>`
      );
    }
    return rays.join('');
  },
  // Money, tickets, pricing.
  ticket: () => `
    <g transform="translate(800 430)">
      <path d="M-300 -110 h600 a0 0 0 0 1 0 0 v70 a40 40 0 0 0 0 80 v70 a0 0 0 0 1 0 0 h-600 a0 0 0 0 1 0 0 v-70 a40 40 0 0 0 0 -80 v-70 a0 0 0 0 1 0 0 z" fill="${figure}"/>
      <line x1="60" y1="-110" x2="60" y2="110" stroke="${bg}" stroke-width="8" stroke-dasharray="18 16"/>
      <rect x="-250" y="-50" width="240" height="24" rx="12" fill="${accent}"/>
      <rect x="-250" y="0" width="150" height="18" rx="9" fill="${bg}" opacity="0.35"/>
    </g>`,
  // Transport, travel, strikes, roadworks.
  transport: () => `
    <g transform="translate(800 430)">
      <rect x="-260" y="-150" width="520" height="250" rx="46" fill="${figure}"/>
      <rect x="-210" y="-100" width="180" height="110" rx="16" fill="${bg}"/>
      <rect x="30" y="-100" width="180" height="110" rx="16" fill="${bg}"/>
      <circle cx="-150" cy="130" r="52" fill="${figure}"/>
      <circle cx="150" cy="130" r="52" fill="${figure}"/>
      <rect x="-300" y="185" width="600" height="16" rx="8" fill="${accent}"/>
    </g>`,
  // Weather warnings, forecasts.
  weather: () => `
    <g transform="translate(800 400)">
      <path d="M-230 60 a130 130 0 0 1 40 -255 a175 175 0 0 1 330 55 a115 115 0 0 1 -20 200 z" fill="${figure}"/>
      <path d="M60 -170 L-40 80 L50 100 L-100 390" stroke="${accent}" stroke-width="34" fill="none" stroke-linejoin="miter" stroke-linecap="square"/>
    </g>`,
  // Heritage, historic buildings, houses.
  heritage: () => `
    <g transform="translate(800 430)">
      <rect x="-280" y="-40" width="560" height="200" fill="${figure}"/>
      <path d="M-320 -40 L0 -210 L320 -40 z" fill="${figure}"/>
      <rect x="-60" y="30" width="120" height="130" rx="60" fill="${bg}"/>
      <rect x="-230" y="20" width="80" height="80" fill="${accent}"/>
      <rect x="150" y="20" width="80" height="80" fill="${accent}"/>
      <rect x="-340" y="160" width="680" height="22" rx="11" fill="${accent}"/>
    </g>`,
  // Music, gigs, nightlife.
  music: () => `
    <g transform="translate(800 430)">
      <rect x="-30" y="-220" width="26" height="330" rx="13" fill="${figure}"/>
      <rect x="180" y="-260" width="26" height="290" rx="13" fill="${figure}"/>
      <path d="M-4 -220 L206 -260 v70 L-4 -150 z" fill="${accent}"/>
      <circle cx="-90" cy="110" r="86" fill="${figure}"/>
      <circle cx="120" cy="30" r="86" fill="${figure}"/>
    </g>`,
  // Markets, stalls, fairs.
  market: () => `
    <g transform="translate(800 430)">
      <rect x="-320" y="-30" width="640" height="190" fill="${figure}"/>
      <path d="M-360 -30 h720 l-60 -120 h-600 z" fill="${accent}"/>
      <path d="M-300 -30 v-120 M-180 -30 v-120 M-60 -30 v-120 M60 -30 v-120 M180 -30 v-120 M300 -30 v-120" stroke="${bg}" stroke-width="26" opacity="0.35"/>
      <rect x="-360" y="160" width="720" height="22" rx="11" fill="${accent}"/>
    </g>`,
};

const motifSvg = (MOTIFS[motif] || MOTIFS.star)();

const svg = `<svg width="1600" height="900" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
  <rect width="1600" height="900" fill="${bg}"/>
  <circle cx="1420" cy="90" r="280" fill="${blob}"/>
  <circle cx="150" cy="830" r="230" fill="${blob}"/>
  ${motifSvg}
  ${
    label
      ? `<text x="800" y="840" font-family="Arial, Helvetica, sans-serif" font-size="26" letter-spacing="6" fill="${labelColour}" text-anchor="middle">${label
          .toUpperCase()
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')}</text>`
      : ''
  }
</svg>`;

const outDir = path.join(process.cwd(), 'public', 'news');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${slug}.png`);

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outFile);
const meta = await sharp(outFile).metadata();

console.log(`written ${outFile} (${meta.width}x${meta.height})`);
console.log(`heroImage.url  = /news/${slug}.png`);
console.log(`heroImage.credit = Graphic: Live Laugh Local`);
console.log(`available motifs: ${Object.keys(MOTIFS).join(', ')}`);
