const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

// Create a simple sparkle/star icon for the app
async function generateIcon() {
  const size = 1024
  const center = size / 2

  // Create SVG for a sparkle icon
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="220" fill="#18181b"/>
      <g transform="translate(${center}, ${center})">
        <!-- Main 4-point star -->
        <path d="M 0 -320 Q 40 -40 320 0 Q 40 40 0 320 Q -40 40 -320 0 Q -40 -40 0 -320" fill="url(#grad)"/>
        <!-- Small sparkles -->
        <circle cx="200" cy="-200" r="30" fill="#60a5fa"/>
        <circle cx="-180" cy="180" r="20" fill="#a78bfa"/>
      </g>
    </svg>
  `

  const outputDir = path.join(__dirname, '..', 'build')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Generate PNG at 1024x1024 for macOS
  await sharp(Buffer.from(svg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(outputDir, 'icon.png'))

  console.log('Generated build/icon.png')

  // Also generate smaller sizes for other platforms
  const sizes = [512, 256, 128, 64, 32, 16]
  for (const s of sizes) {
    await sharp(Buffer.from(svg))
      .resize(s, s)
      .png()
      .toFile(path.join(outputDir, `icon-${s}.png`))
  }
  console.log('Generated all icon sizes')
}

generateIcon().catch(console.error)
