/**
 * Generate app icon (.ico) from favicon.svg
 * Produces multi-size ICO with 16, 24, 32, 48, 64, 128, 256px.
 */
const sharp = require('sharp');
const pngToIco = require('png-to-ico').default || require('png-to-ico').imagesToIco;
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '..', 'images', 'favicon.svg');
const ICO_PATH = path.join(__dirname, 'icon.ico');
const PNG_PATH = path.join(__dirname, 'icon-256.png');

// Read SVG and add a background + padding for a proper app icon
const svgContent = fs.readFileSync(SVG_PATH, 'utf8');

// Create a nicer icon: white rounded-rect background with the M↓ symbol
const iconSvg = `<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" rx="40" fill="#2B2B2B"/>
  <g transform="translate(28, 28) scale(10)">
    <path d="M2.49124 4.04609C2.78636 3.93761 3.11782 4.02473 3.32145 4.2643L7 8.592L10.6785 4.2643C10.8822 4.02473 11.2136 3.93761 11.5088 4.04609C11.8039 4.15457 12 4.43561 12 4.75004V14.25C12 14.6642 11.6642 15 11.25 15C10.8358 15 10.5 14.6642 10.5 14.25V6.79043L7.57145 10.2358C7.42895 10.4034 7.22003 10.5 7 10.5C6.77997 10.5 6.57105 10.4034 6.42855 10.2358L3.5 6.79043V14.25C3.5 14.6642 3.16421 15 2.75 15C2.33579 15 2 14.6642 2 14.25V4.75004C2 4.43561 2.19613 4.15457 2.49124 4.04609ZM13.2197 11.7197C13.5126 11.4268 13.9874 11.4268 14.2803 11.7197L15 12.4394V4.75006C15 4.33585 15.3358 4.00006 15.75 4.00006C16.1642 4.00006 16.5 4.33585 16.5 4.75006V12.4394L17.2197 11.7197C17.5126 11.4268 17.9874 11.4268 18.2803 11.7197C18.5732 12.0126 18.5732 12.4875 18.2803 12.7804L16.2803 14.7804C15.9874 15.0733 15.5126 15.0733 15.2197 14.7804L13.2197 12.7804C12.9268 12.4875 12.9268 12.0126 13.2197 11.7197Z" fill="#FFFFFF"/>
  </g>
</svg>`;

const sizes = [16, 24, 32, 48, 64, 128, 256];

async function generate() {
  // Generate PNGs at each size
  const pngBuffers = [];
  for (const size of sizes) {
    const buf = await sharp(Buffer.from(iconSvg))
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push(buf);
  }

  // Save 256px PNG for electron-builder (it also needs a PNG)
  fs.writeFileSync(PNG_PATH, pngBuffers[pngBuffers.length - 1]);
  console.log(`Saved ${PNG_PATH}`);

  // Convert to ICO
  const icoBuffer = await pngToIco(pngBuffers);
  fs.writeFileSync(ICO_PATH, icoBuffer);
  console.log(`Saved ${ICO_PATH} (${sizes.join(', ')}px)`);
}

generate().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
