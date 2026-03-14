import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputSquare = path.resolve(__dirname, 'assets', 'icon-only.png');
const outputPush = path.resolve(__dirname, 'assets', 'push-icon.png');
const outputAppSquare = path.resolve(__dirname, 'assets', 'icon-bg.png');

async function generateIcons() {
    try {
        console.log('Generating App Square Icon (No transparent borders)...');
        
        await sharp({
            create: {
                width: 1024,
                height: 1024,
                channels: 4,
                background: { r: 59, g: 130, b: 246, alpha: 1 } // #3b82f6
            }
        })
        .composite([{ input: inputSquare, blend: 'over' }])
        .png()
        .toFile(outputAppSquare);
        console.log('Success! Saved icon-bg.png');

        console.log('Generating Push Icon Silhouette...');
        
        // Android Push Notification icons MUST be entirely white with a transparent background.
        // Creating threshold mask
        const mask = await sharp(inputSquare)
            .greyscale()
            .threshold(200) // Lighter parts become white (alpha 255), darker parts become black (alpha 0)
            .toBuffer();
            
        // Create a solid white 512x512 with the mask as alpha transparency
        await sharp({
            create: {
                width: 1024,
                height: 1024,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 } // pure white
            }
        })
        .joinChannel(mask)
        .resize(512, 512)
        .png()
        .toFile(outputPush);
        
        console.log('Success! Saved push-icon.png');

    } catch (e) {
        console.error('Error generating icons:', e);
    }
}

generateIcons();
