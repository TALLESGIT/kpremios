import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const resDir = join(projectRoot, 'android', 'app', 'src', 'main', 'res');

// Read the clean SVG
const svgBuffer = readFileSync(join(projectRoot, 'public', 'zk-icon-clean.svg'));

// Android icon sizes (legacy launcher icons)
const launcherSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Android adaptive icon foreground sizes (108dp per density)
const foregroundSizes = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

async function generateIcons() {
  console.log('🎨 Generating Android icons from ZK logo...\n');

  // Generate legacy launcher icons (ic_launcher.png and ic_launcher_round.png)
  for (const [folder, size] of Object.entries(launcherSizes)) {
    const outDir = join(resDir, folder);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    // Square icon
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(outDir, 'ic_launcher.png'));

    // Round icon (same image, Android clips it)
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(outDir, 'ic_launcher_round.png'));

    console.log(`  ✅ ${folder}: ${size}x${size}px`);
  }

  // Generate adaptive icon foreground (ic_launcher_foreground.png)
  for (const [folder, size] of Object.entries(foregroundSizes)) {
    const outDir = join(resDir, folder);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    // Foreground with padding (icon centered in 66% of total area)
    const iconSize = Math.round(size * 0.66);
    const padding = Math.round((size - iconSize) / 2);

    const iconBuffer = await sharp(svgBuffer)
      .resize(iconSize, iconSize)
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: iconBuffer, left: padding, top: padding }])
      .png()
      .toFile(join(outDir, 'ic_launcher_foreground.png'));

    console.log(`  ✅ ${folder} foreground: ${size}x${size}px`);
  }

  // Update adaptive icon background color to match the blue
  const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#005BAA</color>
</resources>
`;
  const bgPath = join(resDir, 'values', 'ic_launcher_background.xml');
  const { writeFileSync } = await import('fs');
  writeFileSync(bgPath, bgXml);
  console.log('\n  ✅ Background color set to #005BAA');

  console.log('\n🎉 All icons generated successfully!');
}

generateIcons().catch(console.error);
