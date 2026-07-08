const sharp = require('sharp');
const path = require('path');

async function generateOgImage() {
  const width = 1200;
  const height = 630;
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#fdf2f8;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ec4899;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <rect x="0" y="0" width="${width}" height="8" fill="url(#gradient)"/>
      
      <rect x="520" y="160" width="160" height="160" rx="32" fill="url(#gradient)"/>
      <text x="600" y="255" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="white" text-anchor="middle">S</text>
      
      <text x="${width/2}" y="380" font-family="Arial, sans-serif" font-size="56" font-weight="bold" fill="#1e293b" text-anchor="middle">SUBUL Platform</text>
      
      <text x="${width/2}" y="440" font-family="Arial, sans-serif" font-size="28" fill="#64748b" text-anchor="middle">Formation Professionnelle</text>
      
      <text x="${width/2}" y="${height - 60}" font-family="Arial, sans-serif" font-size="24" fill="#94a3b8" text-anchor="middle">app.subul.uk</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(__dirname, '../public/og-image.png'));
  
  console.log('Generated: public/og-image.png');
}

generateOgImage().catch(console.error);
