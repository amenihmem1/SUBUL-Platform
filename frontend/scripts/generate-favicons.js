const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const logoPath = path.join(__dirname, '../public/logo_subul_v2.png');
const outputDir = path.join(__dirname, '../public');

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
];

async function generateFavicons() {
  console.log(`Processing logo: ${logoPath}`);
  
  for (const { name, size } of sizes) {
    await sharp(logoPath)
      .trim()
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(outputDir, name));
    console.log(`Generated: ${name}`);
  }

  await sharp(logoPath)
    .trim()
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outputDir, 'favicon-32x32-for-ico.png'));

  console.log('\nNext steps:');
  console.log('1. Use realfavicongenerator.net with favicon-32x32.png');
  console.log('2. Or for ICO: npm install png-to-ico and convert');
}

generateFavicons().catch(console.error);
